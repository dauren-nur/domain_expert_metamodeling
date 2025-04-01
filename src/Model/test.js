/**
 * Example usage of the MetamodelEvolutionManager
 * This demonstrates how to use the MetamodelEvolutionManager to handle
 * domain expert-driven metamodel evolution.
 */

import MetamodelEvolutionManager from "./MetamodelEvolutionManager.js";

// Function to demonstrate the evolution process
async function demonstrateMetamodelEvolution() {
  try {
    // Initialize the evolution manager
    console.log("Initializing metamodel evolution manager...");
    const evolutionManager = new MetamodelEvolutionManager();

    // Load the original metamodel
    console.log("\n--- Loading the original metamodel ---");
    evolutionManager.loadMetamodel("C:/Users/daure/code/domain_expert_metamodeling/src/test_files/People.ecore");

    // Simulate a series of model-level changes from a domain expert
    // These changes represent what a domain expert might specify in your web interface
    console.log("\n--- Processing domain expert changes ---");

    // 1. Add a new class for Customer
    const addClassChange = {
      type: "add",
      element: "class",
      details: {
        name: "Customer",
        abstract: false,
      },
    };
    console.log("Change 1: Adding Customer class");
    const addClassOp = evolutionManager.interpretModelChange(addClassChange);
    console.log(
      `Operation status: ${addClassOp.status}, Ambiguous: ${addClassOp.ambiguous}`
    );
    if (addClassOp.ambiguous) {
      console.log(`Ambiguity reason: ${addClassOp.ambiguityReason}`);
    }
    const result = evolutionManager.applyPendingChanges();
    console.log(`Success: ${result.success}`);
    console.log(`Applied changes: ${result.appliedChanges.length}`);
    console.log(`Failed changes: ${result.failedChanges.length}`);
    // 2. Add attributes to the Customer class
    const addAttributesChanges = [
      {
        type: "add",
        element: "attribute",
        details: {
          className: "Customer",
          name: "firstName",
          type: "EString",
        },
      },
      {
        type: "add",
        element: "attribute",
        details: {
          className: "Customer",
          name: "lastName",
          type: "EString",
        },
      },
      {
        type: "add",
        element: "attribute",
        details: {
          className: "Customer",
          name: "customerId",
          type: "EInt",
        },
      },
    ];

    console.log("\nChange 2: Adding attributes to Customer class");
    addAttributesChanges.forEach((change, index) => {
      const op = evolutionManager.interpretModelChange(change);
      console.log(
        `Attribute ${index + 1} (${change.details.name}) - Status: ${
          op.status
        }, Ambiguous: ${op.ambiguous}`
      );
      if (op.ambiguous) {
        console.log(`Ambiguity reason: ${op.ambiguityReason}`);
      }
    });

    // 3. Add a reference from Customer to Employee (assuming Employee exists)
    const addReferenceChange = {
      type: "add",
      element: "reference",
      details: {
        sourceClassName: "Customer",
        targetClassName: "Employee", // This may cause ambiguity if Employee doesn't exist
        name: "accountManager",
        containment: false,
        lowerBound: 0,
        upperBound: 1,
      },
    };

    // console.log("\nChange 3: Adding reference from Customer to Employee");
    // const addRefOp = evolutionManager.interpretModelChange(addReferenceChange);
    // console.log(`Operation status: ${addRefOp.status}, Ambiguous: ${addRefOp.ambiguous}, Reason: ${addRefOp.ambiguityReason}`);
    // if (addRefOp.ambiguous) {
    //   console.log(`Ambiguity reason: ${addRefOp.ambiguityReason}`);
    //
    //   // This demonstrates how a domain expert might resolve an ambiguity
    //   // For example, creating the missing Employee class first
    //   console.log("\n--- Resolving ambiguity by adding missing Employee class ---");
    //   const addEmployeeClassChange = {
    //     type: 'add',
    //     element: 'class',
    //     details: {
    //       name: 'Employee',
    //       abstract: false
    //     }
    //   };
    //   const addEmployeeOp = evolutionManager.interpretModelChange(addEmployeeClassChange);
    //   console.log(`Operation status: ${addEmployeeOp.status}, Ambiguous: ${addEmployeeOp.ambiguous}`);
    //
    //   // Now try adding the reference again
    //   console.log("\n--- Retrying to add the reference after resolving ambiguity ---");
    //   const retryAddRefOp = evolutionManager.interpretModelChange(addReferenceChange);
    //   console.log(`Operation status: ${retryAddRefOp.status}, Ambiguous: ${retryAddRefOp.ambiguous}`);
    // }

    // 4. Modify an existing class (might be ambiguous if the class doesn't exist)
    const modifyClassChange = {
      type: "modify",
      element: "class",
      details: {
        name: "Person", // This may cause ambiguity if Person doesn't exist
        newName: "Individual",
      },
    };

    console.log("\nChange 4: Renaming Person class to Individual");
    const modifyClassOp =
      evolutionManager.interpretModelChange(modifyClassChange);
    console.log(
      `Operation status: ${modifyClassOp.status}, Ambiguous: ${modifyClassOp.ambiguous}`
    );
    if (modifyClassOp.ambiguous) {
      console.log(`Ambiguity reason: ${modifyClassOp.ambiguityReason}`);
    }

    // Check for ambiguities
    const ambiguities = evolutionManager.ambiguities;
    console.log(`\n--- Found ${ambiguities.length} ambiguities ---`);
    ambiguities.forEach((ambiguity, index) => {
      console.log(`Ambiguity ${index + 1}: ${ambiguity.ambiguityReason}`);
    });

    // Apply changes if there are no ambiguities or after resolving them
    if (ambiguities.length === 0) {
      console.log("\n--- Applying all pending changes to the metamodel ---");
      const result = evolutionManager.applyPendingChanges();
      console.log(`Success: ${result.success}`);
      console.log(`Applied changes: ${result.appliedChanges.length}`);
      console.log(`Failed changes: ${result.failedChanges.length}`);

      if (result.errors.length > 0) {
        console.log("\nErrors:");
        result.errors.forEach((error) => console.log(`- ${error}`));
      }

      // Save the evolved metamodel
      const outputPath = "PeopleEvolved.ecore";
      evolutionManager.saveEvolvedMetamodel(outputPath);
      console.log(`\nEvolved metamodel saved to ${outputPath}`);

      // Also save as JSON for easy inspection
      const jsonOutputPath = "PeopleEvolved.json";
      evolutionManager.saveEvolvedMetamodel(jsonOutputPath, "json");
      console.log(`Evolved metamodel saved as JSON to ${jsonOutputPath}`);

      // Generate an evolution report
      const report = evolutionManager.generateEvolutionReport();
      console.log("\n--- Evolution Report ---");
      console.log(`Total operations: ${report.totalOperations}`);
      console.log(`Pending changes: ${report.pendingChanges}`);
      console.log(`Ambiguities: ${report.ambiguities}`);
    } else {
      console.log("\nPlease resolve all ambiguities before applying changes.");
    }

    console.log("\n--- Demonstration completed ---");
  } catch (error) {
    console.error("Error during demonstration:", error);
  }
}

// Run the demonstration
demonstrateMetamodelEvolution().catch(console.error);
