/**
 * MetamodelLoader.js
 * A class for loading, analyzing and manipulating Ecore metamodels
 *
 * This class provides functionality to:
 * - Load Ecore metamodels from files or XMI content
 * - Analyze metamodel structure (packages, classes, attributes, references)
 * - Support metamodel queries and modifications
 * - Prepare for evolution operations
 */

import fs from "fs";
import path from "path";
import Ecore from "ecore/dist/ecore.xmi.js";

class MetamodelLoader {
  constructor() {
    this.resourceSet = Ecore.ResourceSet.create();
    this.resources = new Map(); // Map to store loaded resources by URI
    this.currentResource = null;
    this.rootPackage = null;
  }

  /**
   * Load a metamodel from a file
   * @param {string} filePath - Path to the .ecore file
   * @param {string} [resourceName] - Optional name for the resource (defaults to filename)
   * @returns {Object} - The loaded resource
   */
  loadFromFile(filePath, resourceName = null) {
    try {
      // Read the file content
      const xmiContent = fs.readFileSync(filePath, "utf-8");

      // Use filename as resource name if not provided
      if (!resourceName) {
        resourceName = path.basename(filePath);
      }

      // Load the content
      return this.loadFromContent(xmiContent, resourceName);
    } catch (error) {
      console.error(`Error loading metamodel from file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Load a metamodel from XMI content
   * @param {string} xmiContent - The XMI content as string
   * @param {string} resourceName - Name for the resource
   * @returns {Object} - The loaded resource
   */
  loadFromContent(xmiContent, resourceName) {
    try {
      // Create resource
      const resourceUri = `./${resourceName}`;
      const resource = this.resourceSet.create({ uri: resourceUri });

      // Parse content
      resource.parse(xmiContent, Ecore.XMI);

      // Store resource
      this.resources.set(resourceUri, resource);
      this.currentResource = resource;

      // Get root package
      if (resource.get("contents").size() > 0) {
        this.rootPackage = resource.get("contents").at(0);
      }

      console.log(`Metamodel ${resourceName} loaded successfully`);
      return resource;
    } catch (error) {
      console.error(`Error parsing metamodel content:`, error);
      throw error;
    }
  }

  /**
   * Get all EClasses in the metamodel
   * @returns {Array} - Array of EClass objects
   */
  getAllClasses() {
    if (!this.rootPackage || !this.rootPackage.isKindOf(Ecore.EPackage)) {
      return [];
    }

    const classes = [];
    const eClassifiers = this.rootPackage.get("eClassifiers");

    eClassifiers.each((classifier) => {
      if (classifier.isKindOf(Ecore.EClass)) {
        classes.push(classifier);
      }
    });

    return classes;
  }

  /**
   * Get all attributes for a specific class
   * @param {Object|string} eClass - The EClass object or class name
   * @returns {Array} - Array of attribute objects
   */
  getClassAttributes(eClass) {
    let targetClass = eClass;

    // If a string is provided, find the class by name
    if (typeof eClass === "string") {
      targetClass = this.findClassByName(eClass);
      if (!targetClass) {
        console.error(`Class with name ${eClass} not found`);
        return [];
      }
    }

    const attributes = [];
    const eStructuralFeatures = targetClass.get("eStructuralFeatures");

    eStructuralFeatures.each((feature) => {
      if (feature.isKindOf(Ecore.EAttribute)) {
        attributes.push({
          name: feature.get("name"),
          type: feature.get("eType").get("name"),
          lowerBound: feature.get("lowerBound"),
          upperBound: feature.get("upperBound"),
        });
      }
    });

    return attributes;
  }

  /**
   * Get all references for a specific class
   * @param {Object|string} eClass - The EClass object or class name
   * @returns {Array} - Array of reference objects
   */
  getClassReferences(eClass) {
    let targetClass = eClass;

    // If a string is provided, find the class by name
    if (typeof eClass === "string") {
      targetClass = this.findClassByName(eClass);
      if (!targetClass) {
        console.error(`Class with name ${eClass} not found`);
        return [];
      }
    }

    const references = [];
    const eStructuralFeatures = targetClass.get("eStructuralFeatures");

    eStructuralFeatures.each((feature) => {
      if (feature.isKindOf(Ecore.EReference)) {
        references.push({
          name: feature.get("name"),
          type: feature.get("eType").get("name"),
          containment: feature.get("containment"),
          lowerBound: feature.get("lowerBound"),
          upperBound: feature.get("upperBound"),
        });
      }
    });

    return references;
  }

  /**
   * Find a class by name
   * @param {string} className - Name of the class to find
   * @returns {Object|null} - The EClass object or null if not found
   */
  findClassByName(className) {
    if (!this.rootPackage || !this.rootPackage.isKindOf(Ecore.EPackage)) {
      return null;
    }

    let foundClass = null;
    const eClassifiers = this.rootPackage.get("eClassifiers");

    eClassifiers.each((classifier) => {
      if (
        classifier.isKindOf(Ecore.EClass) &&
        classifier.get("name") === className
      ) {
        foundClass = classifier;
        return false; // Break the loop
      }
    });

    return foundClass;
  }

  /**
   * Create a simple report of the metamodel structure
   * @returns {Object} - Report object with packages, classes, and their features
   */
  generateMetamodelReport() {
    const report = {
      packageName: this.rootPackage ? this.rootPackage.get("name") : "Unknown",
      classes: [],
    };

    const classes = this.getAllClasses();

    classes.forEach((cls) => {
      const classReport = {
        name: cls.get("name"),
        attributes: this.getClassAttributes(cls),
        references: this.getClassReferences(cls),
      };

      report.classes.push(classReport);
    });

    return report;
  }

  /**
   * Export the metamodel to JSON
   * @returns {Object} - JSON representation of the metamodel
   */
  exportToJSON() {
    if (!this.currentResource) {
      throw new Error("No resource loaded");
    }

    return this.currentResource.to(Ecore.JSON, true);
  }

  /**
   * Save the metamodel to a file
   * @param {string} filePath - Path to save the file
   * @param {string} [format='xmi'] - Format: 'xmi' or 'json'
   */
  saveToFile(filePath, format = "xmi") {
    if (!this.currentResource) {
      throw new Error("No resource loaded");
    }

    let content;
    if (format.toLowerCase() === "json") {
      content = JSON.stringify(this.exportToJSON(), null, 2);
    } else {
      // Default to XMI
      content = this.currentResource.to(Ecore.XMI);
    }

    fs.writeFileSync(filePath, content, "utf-8");
    console.log(`Metamodel saved to ${filePath}`);
  }

  /**
   * Create a new EClass in the current metamodel
   * @param {string} className - Name for the new class
   * @returns {Object} - The created EClass
   */
  createClass(className) {
    if (!this.rootPackage || !this.rootPackage.isKindOf(Ecore.EPackage)) {
      throw new Error("No valid package loaded");
    }

    // Check if class already exists
    if (this.findClassByName(className)) {
      throw new Error(`Class ${className} already exists`);
    }

    // Create new class
    const newClass = Ecore.EClass.create({
      name: className,
    });

    // Add to package
    this.rootPackage.get("eClassifiers").add(newClass);
    console.log(`Created new class: ${className}`);

    return newClass;
  }

  /**
   * Add an attribute to a class
   * @param {Object|string} eClass - The EClass object or class name
   * @param {string} attributeName - Name for the new attribute
   * @param {Object|string} attributeType - The EDataType object or type name (e.g., 'EString')
   * @param {number} [lowerBound=0] - Lower bound (0 = optional)
   * @param {number} [upperBound=1] - Upper bound (1 = single, -1 = many)
   * @returns {Object} - The created attribute
   */
  addAttribute(
    eClass,
    attributeName,
    attributeType,
    lowerBound = 0,
    upperBound = 1
  ) {
    let targetClass = eClass;
    let targetType = attributeType;

    // If a string is provided for class, find the class by name
    if (typeof eClass === "string") {
      targetClass = this.findClassByName(eClass);
      if (!targetClass) {
        throw new Error(`Class with name ${eClass} not found`);
      }
    }

    // If a string is provided for type, find the datatype
    if (typeof attributeType === "string") {
      // Use Ecore's built-in types
      targetType = Ecore[attributeType];
      if (!targetType) {
        throw new Error(`DataType ${attributeType} not found`);
      }
    }

    // Create new attribute
    const attribute = Ecore.EAttribute.create({
      name: attributeName,
      eType: targetType,
      lowerBound: lowerBound,
      upperBound: upperBound,
    });

    // Add to class
    targetClass.get("eStructuralFeatures").add(attribute);
    console.log(
      `Added attribute ${attributeName} to class ${targetClass.get("name")}`
    );

    return attribute;
  }

  /**
   * Add a reference between classes
   * @param {Object|string} sourceClass - The source EClass object or class name
   * @param {Object|string} targetClass - The target EClass object or class name
   * @param {string} referenceName - Name for the new reference
   * @param {boolean} [containment=false] - Whether this is a containment reference
   * @param {number} [lowerBound=0] - Lower bound (0 = optional)
   * @param {number} [upperBound=1] - Upper bound (1 = single, -1 = many)
   * @returns {Object} - The created reference
   */
  addReference(
    sourceClass,
    targetClass,
    referenceName,
    containment = false,
    lowerBound = 0,
    upperBound = 1
  ) {
    let source = sourceClass;
    let target = targetClass;

    // If a string is provided for source, find the class by name
    if (typeof sourceClass === "string") {
      source = this.findClassByName(sourceClass);
      if (!source) {
        throw new Error(`Source class with name ${sourceClass} not found`);
      }
    }

    // If a string is provided for target, find the class by name
    if (typeof targetClass === "string") {
      target = this.findClassByName(targetClass);
      if (!target) {
        throw new Error(`Target class with name ${targetClass} not found`);
      }
    }

    // Create new reference
    const reference = Ecore.EReference.create({
      name: referenceName,
      eType: target,
      containment: containment,
      lowerBound: lowerBound,
      upperBound: upperBound,
    });

    // Add to source class
    source.get("eStructuralFeatures").add(reference);
    console.log(
      `Added reference ${referenceName} from ${source.get(
        "name"
      )} to ${target.get("name")}`
    );

    return reference;
  }
}

export default MetamodelLoader;
