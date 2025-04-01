/**
 * MetamodelEvolutionManager.js
 *
 * This class manages the evolution of metamodels based on domain expert input.
 * It extends the MetamodelLoader with functionality to:
 * - Interpret model-level changes as metamodel evolution operations
 * - Handle ambiguities in evolution specifications
 * - Apply changes to the metamodel
 * - Perform validation and consistency checking
 * - Support model co-evolution
 */

import MetamodelLoader from './MetamodelLoader.js';
import Ecore from 'ecore/dist/ecore.xmi.js';

class MetamodelEvolutionManager {
  constructor() {
    this.loader = new MetamodelLoader();
    this.evolutionOperations =[];
    this.ambiguities =[];
    this.pendingChanges =[];
  }

  /**
   * Load a metamodel for evolution
   * @param {string} filePath - Path to the metamodel file
   * @returns {Object} - The loaded metamodel resource
   */
  loadMetamodel(filePath) {
    return this.loader.loadFromFile(filePath);
  }

  /**
   * Interpret a model-level change and convert it to a metamodel evolution operation
   * @param {Object} modelChange - Description of the model-level change
   * @returns {Object} - Metamodel evolution operation
   */
  interpretModelChange(modelChange) {
    // Structure of modelChange:
    // {
    //   type: 'add'|'remove'|'modify',
    //   element: 'attribute'|'class'|'reference',
    //   details: { ... specific details of the change ... }
    // }

    const operation = {
      type: modelChange.type,
      element: modelChange.element,
      details: modelChange.details,
      status: 'pending',
      ambiguous: false,
      ambiguityReason: null,
      metamodelOperation: null
    };

    // Interpret based on change type and element
    switch (`${modelChange.type}_${modelChange.element}`) {
      case 'add_class':
        operation.metamodelOperation = this._createAddClassOperation(modelChange.details);
        break;
      case 'add_attribute':
        operation.metamodelOperation = this._createAddAttributeOperation(modelChange.details);
        break;
      case 'add_reference':
        operation.metamodelOperation = this._createAddReferenceOperation(modelChange.details);
        break;
      case 'remove_class':
        operation.metamodelOperation = this._createRemoveClassOperation(modelChange.details);
        break;
      case 'remove_attribute':
        operation.metamodelOperation = this._createRemoveAttributeOperation(modelChange.details);
        break;
      case 'remove_reference':
        operation.metamodelOperation = this._createRemoveReferenceOperation(modelChange.details);
        break;
      case 'modify_class':
        operation.metamodelOperation = this._createModifyClassOperation(modelChange.details);
        break;
      case 'modify_attribute':
        operation.metamodelOperation = this._createModifyAttributeOperation(modelChange.details);
        break;
      case 'modify_reference':
        operation.metamodelOperation = this._createModifyReferenceOperation(modelChange.details);
        break;
      default:
        operation.status = 'error';
        operation.ambiguous = true;
        operation.ambiguityReason = 'Unknown change type or element';
        break;
    }

    // Check for ambiguities
    if (operation.metamodelOperation && operation.metamodelOperation.ambiguous) {
      operation.ambiguous = true;
      operation.ambiguityReason = operation.metamodelOperation.ambiguityReason;
      this.ambiguities.push(operation);
    } else {
      this.pendingChanges.push(operation);
    }

    // Add to evolution operations
    this.evolutionOperations.push(operation);
    return operation;
  }

  /**
   * Create an operation to add a new class to the metamodel
   * @param {Object} details - Details of the class to add
   * @returns {Object} - Metamodel operation
   */
  _createAddClassOperation(details) {
    const operation = {
      action: 'addClass',
      className: details.name,
      superTypes: details.superTypes || [],
      abstract: details.abstract || false,
      interface: details.interface || false,
      ambiguous: false,
      ambiguityReason: null
    };

    // Check for ambiguities
    if (!details.name) {
      operation.ambiguous = true;
      operation.ambiguityReason = 'Class name is required';
    } else if (this.loader.findClassByName(details.name)) {
      operation.ambiguous = true;
      operation.ambiguityReason = `Class ${details.name} already exists`;
    }

    return operation;
  }

  /**
   * Create an operation to add a new attribute to a class
   * @param {Object} details - Details of the attribute to add
   * @returns {Object} - Metamodel operation
   */
  _createAddAttributeOperation(details) {
    const operation = {
      action: 'addAttribute',
      className: details.className,
      attributeName: details.name,
      attributeType: details.type || 'EString',
      lowerBound: details.lowerBound || 0,
      upperBound: details.upperBound || 1,
      ambiguous: false,
      ambiguityReason: null
    };

    // Check for ambiguities
    if (!details.className) {
      operation.ambiguous = true;
      operation.ambiguityReason = 'Class name is required';
    } else if (!details.name) {
      operation.ambiguous = true;
      operation.ambiguityReason = 'Attribute name is required';
    } else {
      const targetClass = this.loader.findClassByName(details.className);
      if (!targetClass) {
        operation.ambiguous = true;
        operation.ambiguityReason = `Class ${details.className} does not exist`;
      } else {
        // Check if attribute already exists
        const existingAttributes = this.loader.getClassAttributes(targetClass);
        const attributeExists = existingAttributes.some(attr => attr.name === details.name);
        if (attributeExists) {
          operation.ambiguous = true;
          operation.ambiguityReason = `Attribute ${details.name} already exists in class ${details.className}`;
        }
      }
    }

    return operation;
  }

  /**
   * Create an operation to add a new reference between classes
   * @param {Object} details - Details of the reference to add
   * @returns {Object} - Metamodel operation
   */
  _createAddReferenceOperation(details) {
    const operation = {
      action: 'addReference',
      sourceClassName: details.sourceClassName,
      targetClassName: details.targetClassName,
      referenceName: details.name,
      containment: details.containment || false,
      lowerBound: details.lowerBound || 0,
      upperBound: details.upperBound || 1,
      ambiguous: false,
      ambiguityReason: null
    };

    // Check for ambiguities
    if (!details.sourceClassName) {
      operation.ambiguous = true;
      operation.ambiguityReason = 'Source class name is required';
    } else if (!details.targetClassName) {
      operation.ambiguous = true;
      operation.ambiguityReason = 'Target class name is required';
    } else if (!details.name) {
      operation.ambiguous = true;
      operation.ambiguityReason = 'Reference name is required';
    } else {
      const sourceClass = this.loader.findClassByName(details.sourceClassName);
      const targetClass = this.loader.findClassByName(details.targetClassName);

      if (!sourceClass) {
        operation.ambiguous = true;
        operation.ambiguityReason = `Source class ${details.sourceClassName} does not exist`;
      } else if (!targetClass) {
        operation.ambiguous = true;
        operation.ambiguityReason = `Target class ${details.targetClassName} does not exist`;
      } else {
        // Check if reference already exists
        const existingReferences = this.loader.getClassReferences(sourceClass);
        const referenceExists = existingReferences.some(ref => ref.name === details.name);
        if (referenceExists) {
          operation.ambiguous = true;
          operation.ambiguityReason = `Reference ${details.name} already exists in class ${details.sourceClassName}`;
        }
      }
    }

    return operation;
  }

  /**
   * Create an operation to remove a class from the metamodel
   * @param {Object} details - Details of the class to remove
   * @returns {Object} - Metamodel operation
   */
  _createRemoveClassOperation(details) {
    const operation = {
      action: 'removeClass',
      className: details.name,
      ambiguous: false,
      ambiguityReason: null
    };

    // Check for ambiguities
    if (!details.name) {
      operation.ambiguous = true;
      operation.ambiguityReason = 'Class name is required';
    } else {
      const targetClass = this.loader.findClassByName(details.name);
      if (!targetClass) {
        operation.ambiguous = true;
        operation.ambiguityReason = `Class ${details.name} does not exist`;
      } else {
        // Check if class is referenced by other classes
        const referencingClasses = this._findClassesReferencingClass(details.name);
        if (referencingClasses.length > 0) {
          operation.ambiguous = true;
          operation.ambiguityReason = `Class ${details.name} is referenced by: ${referencingClasses.join(', ')}`;
        }
      }
    }

    return operation;
  }

  /**
   * Create an operation to remove an attribute from a class
   * @param {Object} details - Details of the attribute to remove
   * @returns {Object} - Metamodel operation
   */
  _createRemoveAttributeOperation(details) {
    const operation = {
      action: 'removeAttribute',
      className: details.className,
      attributeName: details.name,
      ambiguous: false,
      ambiguityReason: null
    };

    // Check for ambiguities
    if (!details.className) {
      operation.ambiguous = true;
      operation.ambiguityReason = 'Class name is required';
    } else if (!details.name) {
      operation.ambiguous = true;
      operation.ambiguityReason = 'Attribute name is required';
    } else {
      const targetClass = this.loader.findClassByName(details.className);
      if (!targetClass) {
        operation.ambiguous = true;
        operation.ambiguityReason = `Class ${details.className} does not exist`;
      } else {
        // Check if attribute exists
        const existingAttributes = this.loader.getClassAttributes(targetClass);
        const attributeExists = existingAttributes.some(attr => attr.name === details.name);
        if (!attributeExists) {
          operation.ambiguous = true;
          operation.ambiguityReason = `Attribute ${details.name} does not exist in class ${details.className}`;
        }
      }
    }

    return operation;
  }

  /**
   * Create an operation to remove a reference from a class
   * @param {Object} details - Details of the reference to remove
   * @returns {Object} - Metamodel operation
   */
  _createRemoveReferenceOperation(details) {
    const operation = {
      action: 'removeReference',
      className: details.className,
      referenceName: details.name,
      ambiguous: false,
      ambiguityReason: null
    };

    // Check for ambiguities
    if (!details.className) {
      operation.ambiguous = true;
      operation.ambiguityReason = 'Class name is required';
    } else if (!details.name) {
      operation.ambiguous = true;
      operation.ambiguityReason = 'Reference name is required';
    } else {
      const targetClass = this.loader.findClassByName(details.className);
      if (!targetClass) {
        operation.ambiguous = true;
        operation.ambiguityReason = `Class ${details.className} does not exist`;
      } else {
        // Check if reference exists
        const existingReferences = this.loader.getClassReferences(targetClass);
        const referenceExists = existingReferences.some(ref => ref.name === details.name);
        if (!referenceExists) {
          operation.ambiguous = true;
          operation.ambiguityReason = `Reference ${details.name} does not exist in class ${details.className}`;
        }
      }
    }

    return operation;
  }

  /**
   * Create an operation to modify a class in the metamodel
   * @param {Object} details - Details of the class modification
   * @returns {Object} - Metamodel operation
   */
  _createModifyClassOperation(details) {
    const operation = {
      action: 'modifyClass',
      className: details.name,
      newName: details.newName,
      newSuperTypes: details.newSuperTypes,
      newAbstract: details.newAbstract,
      newInterface: details.newInterface,
      ambiguous: false,
      ambiguityReason: null
    };

    // Check for ambiguities
    if (!details.name) {
      operation.ambiguous = true;
      operation.ambiguityReason = 'Class name is required';
    } else {
      const targetClass = this.loader.findClassByName(details.name);
      if (!targetClass) {
        operation.ambiguous = true;
        operation.ambiguityReason = `Class ${details.name} does not exist`;
      } else if (details.newName && this.loader.findClassByName(details.newName)) {
        operation.ambiguous = true;
        operation.ambiguityReason = `Class ${details.newName} already exists`;
      }
    }

    return operation;
  }

  /**
   * Create an operation to modify an attribute in a class
   * @param {Object} details - Details of the attribute modification
   * @returns {Object} - Metamodel operation
   */
  _createModifyAttributeOperation(details) {
    const operation = {
      action: 'modifyAttribute',
      className: details.className,
      attributeName: details.name,
      newName: details.newName,
      newType: details.newType,
      newLowerBound: details.newLowerBound,
      newUpperBound: details.newUpperBound,
      ambiguous: false,
      ambiguityReason: null
    };

    // Check for ambiguities
    if (!details.className) {
      operation.ambiguous = true;
      operation.ambiguityReason = 'Class name is required';
    } else if (!details.name) {
      operation.ambiguous = true;
      operation.ambiguityReason = 'Attribute name is required';
    } else {
      const targetClass = this.loader.findClassByName(details.className);
      if (!targetClass) {
        operation.ambiguous = true;
        operation.ambiguityReason = `Class ${details.className} does not exist`;
      } else {
        // Check if attribute exists
        const existingAttributes = this.loader.getClassAttributes(targetClass);
        const attributeExists = existingAttributes.some(attr => attr.name === details.name);
        if (!attributeExists) {
          operation.ambiguous = true;
          operation.ambiguityReason = `Attribute ${details.name} does not exist in class ${details.className}`;
        } else if (details.newName) {
          // Check if new name would conflict
          const newNameExists = existingAttributes.some(attr => attr.name === details.newName);
          if (newNameExists) {
            operation.ambiguous = true;
            operation.ambiguityReason = `Attribute ${details.newName} already exists in class ${details.className}`;
          }
        }
      }
    }

    return operation;
  }

  /**
   * Create an operation to modify a reference in a class
   * @param {Object} details - Details of the reference modification
   * @returns {Object} - Metamodel operation
   */
  _createModifyReferenceOperation(details) {
    const operation = {
      action: 'modifyReference',
      className: details.className,
      referenceName: details.name,
      newName: details.newName,
      newTargetClassName: details.newTargetClassName,
      newContainment: details.newContainment,
      newLowerBound: details.newLowerBound,
      newUpperBound: details.newUpperBound,
      ambiguous: false,
      ambiguityReason: null
    };

    // Check for ambiguities
    if (!details.className) {
      operation.ambiguous = true;
      operation.ambiguityReason = 'Class name is required';
    } else if (!details.name) {
      operation.ambiguous = true;
      operation.ambiguityReason = 'Reference name is required';
    } else {
      const targetClass = this.loader.findClassByName(details.className);
      if (!targetClass) {
        operation.ambiguous = true;
        operation.ambiguityReason = `Class ${details.className} does not exist`;
      } else {
        // Check if reference exists
        const existingReferences = this.loader.getClassReferences(targetClass);
        const referenceExists = existingReferences.some(ref => ref.name === details.name);
        if (!referenceExists) {
          operation.ambiguous = true;
          operation.ambiguityReason = `Reference ${details.name} does not exist in class ${details.className}`;
        } else if (details.newName) {
          // Check if new name would conflict
          const newNameExists = existingReferences.some(ref => ref.name === details.newName);
          if (newNameExists) {
            operation.ambiguous = true;
            operation.ambiguityReason = `Reference ${details.newName} already exists in class ${details.className}`;
          }
        }

        // Check if target class exists
        if (details.newTargetClassName) {
          const newTargetClass = this.loader.findClassByName(details.newTargetClassName);
          if (!newTargetClass) {
            operation.ambiguous = true;
            operation.ambiguityReason = `Target class ${details.newTargetClassName} does not exist`;
          }
        }
      }
    }

    return operation;
  }

  /**
   * Find classes that reference a specific class
   * @param {string} className - Name of the class to check
   * @returns {Array} - Array of class names that reference the given class
   */
  _findClassesReferencingClass(className) {
    const referencingClasses = [];
    const allClasses = this.loader.getAllClasses();

    allClasses.forEach(cls => {
      const references = this.loader.getClassReferences(cls);
      references.forEach(ref => {
        if (ref.type === className) {
          referencingClasses.push(cls.get('name'));
        }
      });
    });

    return referencingClasses;
  }

  /**
   * Resolve ambiguities in a metamodel operation
   * @param {number} operationIndex - Index of the operation in the evolutionOperations array
   * @param {Object} resolution - Resolution details
   * @returns {Object} - Updated operation
   */
  resolveAmbiguity(operationIndex, resolution) {
    const operation = this.evolutionOperations[operationIndex];
    if (!operation) {
      throw new Error(`Operation at index ${operationIndex} not found`);
    }

    if (!operation.ambiguous) {
      console.log(`Operation at index ${operationIndex} is not ambiguous`);
      return operation;
    }

    // Apply resolution to the metamodelOperation details
    if (operation.metamodelOperation) {
      Object.assign(operation.metamodelOperation, resolution);
    }

    // Mark as resolved
    operation.ambiguous = false;
    operation.ambiguityReason = null;
    operation.status = 'pending'; // Move back to pending state after resolution

    // Move from ambiguities to pending changes if not already there
    const ambiguityIndex = this.ambiguities.findIndex(op => op === operation);
    if (ambiguityIndex !== -1) {
      this.ambiguities.splice(ambiguityIndex, 1);
      if (!this.pendingChanges.includes(operation)) {
        this.pendingChanges.push(operation);
      }
    }

    return operation;
  }

  /**
   * Apply all pending changes to the metamodel
   * @returns {Object} - Result of the application
   */
  applyPendingChanges() {
    const result = {
      success: true,
      appliedChanges:[],
      failedChanges:[],
      errors:[]
    };

    // Check if there are ambiguities
    if (this.ambiguities.length > 0) {
      result.success = false;
      result.errors.push(`There are ${this.ambiguities.length} unresolved ambiguities. Please resolve them before applying changes.`);
      return result;
    }

    // Apply each pending change
    for (const operation of this.pendingChanges) {
      try {
        this._applyOperation(operation);
        operation.status = 'applied';
        result.appliedChanges.push(operation);
      } catch (error) {
        operation.status = 'failed';
        operation.error = error.message;
        result.failedChanges.push(operation);
        result.errors.push(`Failed to apply operation: ${error.message}`);
        result.success = false;
      }
    }

    // Clear pending changes
    this.pendingChanges = [];

    return result;
  }

  /**
   * Apply a single operation to the metamodel
   * @param {Object} operation - The operation to apply
   */
  _applyOperation(operation) {
    const metamodelOp = operation.metamodelOperation;

    switch (metamodelOp.action) {
      case 'addClass':
        this._applyAddClass(metamodelOp);
        break;
      case 'addAttribute':
        this._applyAddAttribute(metamodelOp);
        break;
      case 'addReference':
        this._applyAddReference(metamodelOp);
        break;
      case 'removeClass':
        this._applyRemoveClass(metamodelOp);
        break;
      case 'removeAttribute':
        this._applyRemoveAttribute(metamodelOp);
        break;
      case 'removeReference':
        this._applyRemoveReference(metamodelOp);
        break;
      case 'modifyClass':
        this._applyModifyClass(metamodelOp);
        break;
      case 'modifyAttribute':
        this._applyModifyAttribute(metamodelOp);
        break;
      case 'modifyReference':
        this._applyModifyReference(metamodelOp);
        break;
      default:
        throw new Error(`Unknown operation action: ${metamodelOp.action}`);
    }
  }

  /**
   * Apply an add class operation
   * @param {Object} operation - The add class operation
   */
  _applyAddClass(operation) {
    this.loader.createClass(operation.className, operation.superTypes, operation.abstract, operation.interface);
  }

  /**
   * Apply an add attribute operation
   * @param {Object} operation - The add attribute operation
   */
  _applyAddAttribute(operation) {
    this.loader.addAttribute(
      operation.className,
      operation.attributeName,
      operation.attributeType,
      operation.lowerBound,
      operation.upperBound
    );
  }

  /**
   * Apply an add reference operation
   * @param {Object} operation - The add reference operation
   */
  _applyAddReference(operation) {
    this.loader.addReference(
      operation.sourceClassName,
      operation.targetClassName,
      operation.referenceName,
      operation.containment,
      operation.lowerBound,
      operation.upperBound
    );
  }

  /**
   * Apply a remove class operation
   * @param {Object} operation - The remove class operation
   */
  _applyRemoveClass(operation) {
    const targetClass = this.loader.findClassByName(operation.className);
    if (!targetClass) {
      throw new Error(`Class ${operation.className} not found`);
    }

    this.loader.rootPackage.get('eClassifiers').remove(targetClass);
  }

  /**
   * Apply a remove attribute operation
   * @param {Object} operation - The remove attribute operation
   */
  _applyRemoveAttribute(operation) {
    const targetClass = this.loader.findClassByName(operation.className);
    if (!targetClass) {
      throw new Error(`Class ${operation.className} not found`);
    }

    const eStructuralFeatures = targetClass.get('eStructuralFeatures');
    let attributeToRemove = null;

    eStructuralFeatures.each((feature) => {
      if (feature.isKindOf(Ecore.EAttribute) && feature.get('name') === operation.attributeName) {
        attributeToRemove = feature;
        return false; // Break the loop
      }
    });

    if (!attributeToRemove) {
      throw new Error(`Attribute ${operation.attributeName} not found in class ${operation.className}`);
    }

    eStructuralFeatures.remove(attributeToRemove);
  }

  /**
   * Apply a remove reference operation
   * @param {Object} operation - The remove reference operation
   */
  _applyRemoveReference(operation) {
    const targetClass = this.loader.findClassByName(operation.className);
    if (!targetClass) {
      throw new Error(`Class ${operation.className} not found`);
    }

    const eStructuralFeatures = targetClass.get('eStructuralFeatures');
    let referenceToRemove = null;

    eStructuralFeatures.each((feature) => {
      if (feature.isKindOf(Ecore.EReference) && feature.get('name') === operation.referenceName) {
        referenceToRemove = feature;
        return false; // Break the loop
      }
    });

    if (!referenceToRemove) {
      throw new Error(`Reference ${operation.referenceName} not found in class ${operation.className}`);
    }

    eStructuralFeatures.remove(referenceToRemove);
  }

  /**
   * Apply a modify class operation
   * @param {Object} operation - The modify class operation
   */
  _applyModifyClass(operation) {
    const targetClass = this.loader.findClassByName(operation.className);
    if (!targetClass) {
      throw new Error(`Class ${operation.className} not found`);
    }

    // Update class properties
    if (operation.newName) {
      targetClass.set('name', operation.newName);
    }

    if (operation.newAbstract !== undefined) {
      targetClass.set('abstract', operation.newAbstract);
    }

    if (operation.newInterface !== undefined) {
      targetClass.set('interface', operation.newInterface);
    }

    // Update super types if provided
    if (operation.newSuperTypes) {
      // Clear existing super types
      targetClass.get('eSuperTypes').clear();

      // Add new super types
      operation.newSuperTypes.forEach(superTypeName => {
        const superType = this.loader.findClassByName(superTypeName);
        if (!superType) {
          throw new Error(`Super type ${superTypeName} not found`);
        }
        targetClass.get('eSuperTypes').add(superType);
      });
    }
  }

  /**
   * Apply a modify attribute operation
   * @param {Object} operation - The modify attribute operation
   */
  _applyModifyAttribute(operation) {
    const targetClass = this.loader.findClassByName(operation.className);
    if (!targetClass) {
      throw new Error(`Class ${operation.className} not found`);
    }

    const eStructuralFeatures = targetClass.get('eStructuralFeatures');
    let attributeToModify = null;

    eStructuralFeatures.each((feature) => {
      if (feature.isKindOf(Ecore.EAttribute) && feature.get('name') === operation.attributeName) {
        attributeToModify = feature;
        return false; // Break the loop
      }
    });

    if (!attributeToModify) {
      throw new Error(`Attribute ${operation.attributeName} not found in class ${operation.className}`);
    }

    // Update attribute properties
    if (operation.newName) {
      attributeToModify.set('name', operation.newName);
    }

    if (operation.newType) {
      // If it's a string, assume it's one of Ecore's built-in types
      const newType = typeof operation.newType === 'string' ? Ecore[operation.newType] : operation.newType;
      if (!newType) {
        throw new Error(`Type ${operation.newType} not found`);
      }
      attributeToModify.set('eType', newType);
    }

    if (operation.newLowerBound !== undefined) {
      attributeToModify.set('lowerBound', operation.newLowerBound);
    }

    if (operation.newUpperBound !== undefined) {
      attributeToModify.set('upperBound', operation.newUpperBound);
    }
  }

  /**
   * Apply a modify reference operation
   * @param {Object} operation - The modify reference operation
   */
  _applyModifyReference(operation) {
    const targetClass = this.loader.findClassByName(operation.className);
    if (!targetClass) {
      throw new Error(`Class ${operation.className} not found`);
    }

    const eStructuralFeatures = targetClass.get('eStructuralFeatures');
    let referenceToModify = null;

    eStructuralFeatures.each((feature) => {
      if (feature.isKindOf(Ecore.EReference) && feature.get('name') === operation.referenceName) {
        referenceToModify = feature;
        return false; // Break the loop
      }
    });

    if (!referenceToModify) {
      throw new Error(`Reference ${operation.referenceName} not found in class ${operation.className}`);
    }

    // Update reference properties
    if (operation.newName) {
      referenceToModify.set('name', operation.newName);
    }

    if (operation.newTargetClassName) {
      const newTargetClass = this.loader.findClassByName(operation.newTargetClassName);
      if (!newTargetClass) {
        throw new Error(`Target class ${operation.newTargetClassName} not found`);
      }
      referenceToModify.set('eType', newTargetClass);
    }

    if (operation.newContainment !== undefined) {
      referenceToModify.set('containment', operation.newContainment);
    }

    if (operation.newLowerBound !== undefined) {
      referenceToModify.set('lowerBound', operation.newLowerBound);
    }

    if (operation.newUpperBound !== undefined) {
      referenceToModify.set('upperBound', operation.newUpperBound);
    }
  }

  /**
   * Save the evolved metamodel to a file
   * @param {string} filePath - Path to save the metamodel
   * @param {string} [format='xmi'] - Format to save in ('xmi' or 'json')
   */
  saveEvolvedMetamodel(filePath, format = 'xmi') {
    this.loader.saveToFile(filePath, format);
  }

  /**
   * Generate a report of the evolution operations and their status
   * @returns {Object} - Evolution report
   */
  generateEvolutionReport() {
    return {
      totalOperations: this.evolutionOperations.length,
      pendingChanges: this.pendingChanges.length,
      ambiguities: this.ambiguities.length,
      operations: this.evolutionOperations.map(op => ({
        type: op.type,
        element: op.element,
        details: op.details,
        status: op.status,
        ambiguous: op.ambiguous,
        ambiguityReason: op.ambiguityReason
      }))
    };
  }

  /**
   * Model co-evolution - adapt models to match the evolved metamodel
   * @param {string} modelPath - Path to the model file
   * @param {string} outputPath - Path to save the co-evolved model
   * @returns {Object} - Result of the co-evolution
   */
  coEvolveModel(modelPath, outputPath) {
    // This is a placeholder implementation
    // In a real implementation, this would:
    // 1. Load the model
    // 2. Apply transformations based on the metamodel changes
    // 3. Save the transformed model

    console.log(`Co-evolution of model ${modelPath} is not yet implemented`);

    return {
      success: false,
      message: 'Model co-evolution is not yet implemented',
      modelPath,
      outputPath
    };
  }
}

export default MetamodelEvolutionManager;