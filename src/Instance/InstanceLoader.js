/**
 * InstanceLoader.js
 * A module for loading and parsing XMI instance files for domain-specific models
 */

class InstanceLoader {
    /**
     * Load an XMI instance file from a string or file path
     * @param {string} xmiContent - The XMI content as a string
     * @returns {Object} - Parsed instance as a JavaScript object
     */
    static loadFromString(xmiContent) {
      try {
        // Create a DOM parser
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmiContent, "application/xml");
        
        // Check for parsing errors
        const parserError = xmlDoc.querySelector("parsererror");
        if (parserError) {
          throw new Error(`XML parsing error: ${parserError.textContent}`);
        }
        
        return this.parseXmlDocument(xmlDoc);
      } catch (error) {
        console.error("Error loading XMI instance:", error);
        throw error;
      }
    }
    
    /**
     * Load an XMI instance file from a file path
     * @param {string} filePath - Path to the XMI file
     * @returns {Promise<Object>} - Parsed instance as a JavaScript object
     */
    static async loadFromFile(filePath) {
      try {
        // For Node.js environment
        if (typeof window === 'undefined') {
          const fs = await import('fs/promises');
          const xmiContent = await fs.readFile(filePath, 'utf8');
          
          // Use node-based XML parser
          const { DOMParser } = await import('xmldom');
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(xmiContent, "application/xml");
          
          return this.parseXmlDocument(xmlDoc);
        } 
        // For browser environment
        else {
          const response = await fetch(filePath);
          const xmiContent = await response.text();
          return this.loadFromString(xmiContent);
        }
      } catch (error) {
        console.error(`Error loading XMI file from ${filePath}:`, error);
        throw error;
      }
    }
    
    /**
     * Parse an XML document into a JavaScript object structure
     * @param {Document} xmlDoc - The XML document to parse
     * @returns {Object} - Parsed instance as a JavaScript object
     */
    static parseXmlDocument(xmlDoc) {
      // Get the root element (e.g., Company in your example)
      const rootElement = xmlDoc.documentElement;
      
      // Parse the root element
      const rootObject = this.parseElement(rootElement);
      
      // Add namespaces and schema information
      rootObject._namespaces = {};
      rootObject._schemaLocation = null;
      
      // Extract namespace information
      for (const attr of rootElement.attributes) {
        const name = attr.name;
        const value = attr.value;
        
        if (name.startsWith('xmlns:')) {
          const prefix = name.substring(6);
          rootObject._namespaces[prefix] = value;
        } else if (name === 'xsi:schemaLocation') {
          rootObject._schemaLocation = value;
        }
      }
      
      // Resolve references in the object tree
      this.resolveReferences(rootObject);
      
      return rootObject;
    }
    
    /**
     * Parse an XML element into a JavaScript object
     * @param {Element} element - The XML element to parse
     * @returns {Object} - The parsed element as a JavaScript object
     */
    static parseElement(element) {
      const result = {
        _type: element.nodeName,
        _id: element.getAttribute('xmi:id') || null,
        _children: []
      };
      
      // Process attributes
      for (const attr of element.attributes) {
        // Skip xmi namespace attributes
        if (attr.name.startsWith('xmlns:') || attr.name.startsWith('xmi:') || attr.name === 'xsi:schemaLocation') {
          continue;
        }
        
        // Add other attributes
        result[attr.name] = attr.value;
      }
      
      // Process child elements
      for (const childNode of element.childNodes) {
        if (childNode.nodeType === 1) { // Element node
          const childElement = childNode;
          const childName = childElement.nodeName;
          
          // Check if this is a reference
          const href = childElement.getAttribute('href');
          if (href) {
            if (!result[childName]) {
              result[childName] = [];
            }
            
            result[childName].push({
              _isReference: true,
              _href: href,
              _type: childElement.getAttribute('xsi:type') || null
            });
          } else {
            // Regular child element
            const childObj = this.parseElement(childElement);
            
            // Add to appropriate collection
            if (!result[childName]) {
              result[childName] = [];
            }
            
            result[childName].push(childObj);
            result._children.push(childName);
          }
        }
      }
      
      return result;
    }
    
    /**
     * Resolve references in the object tree
     * @param {Object} rootObject - The root object of the parsed instance
     */
    static resolveReferences(rootObject) {
      const referenceMap = new Map();
      
      // First pass: build a map of all objects with IDs
      this.buildReferenceMap(rootObject, '', referenceMap);
      
      // Second pass: resolve references
      this.resolveReferencesInObject(rootObject, referenceMap);
    }
    
    /**
     * Build a map of all objects with IDs for reference resolution
     * @param {Object} obj - The current object to process
     * @param {string} path - The current path to this object
     * @param {Map} referenceMap - The map to populate with references
     */
    static buildReferenceMap(obj, path, referenceMap) {
      // Add this object to the reference map if it has an ID
      if (obj._id) {
        referenceMap.set(`#${obj._id}`, obj);
      }
      
      // Add this object to the reference map by path
      referenceMap.set(path, obj);
      
      // Process all properties that are arrays of objects
      for (const key of Object.keys(obj)) {
        if (Array.isArray(obj[key])) {
          obj[key].forEach((item, index) => {
            if (item && typeof item === 'object') {
              this.buildReferenceMap(item, `${path}/@${key}.${index}`, referenceMap);
            }
          });
        }
      }
    }
    
    /**
     * Resolve references in an object and its children
     * @param {Object} obj - The object to process
     * @param {Map} referenceMap - The map of all objects with IDs
     */
    static resolveReferencesInObject(obj, referenceMap) {
      // Process all properties
      for (const key of Object.keys(obj)) {
        if (Array.isArray(obj[key])) {
          for (let i = 0; i < obj[key].length; i++) {
            const item = obj[key][i];
            
            // If this is a reference, resolve it
            if (item && typeof item === 'object' && item._isReference) {
              const href = item._href;
              if (href) {
                // Try to resolve the reference
                const target = referenceMap.get(href);
                if (target) {
                  // Replace the reference placeholder with the actual object
                  obj[key][i] = {
                    _resolvedReference: true,
                    _href: href,
                    _type: item._type,
                    _target: target
                  };
                }
              }
            } 
            // Otherwise, process child objects recursively
            else if (item && typeof item === 'object') {
              this.resolveReferencesInObject(item, referenceMap);
            }
          }
        }
      }
    }
    
    /**
     * Save the model back to XMI format
     * @param {Object} model - The model object to serialize
     * @returns {string} - The XMI content as a string
     */
    static saveToXMI(model) {
      // Create a serializer
      const serializer = new XMLSerializer();
      const doc = document.implementation.createDocument(null, null, null);
      
      // Create the root element
      const rootName = model._type;
      const rootEl = doc.createElement(rootName);
      
      // Add namespaces
      if (model._namespaces) {
        for (const prefix in model._namespaces) {
          rootEl.setAttribute(`xmlns:${prefix}`, model._namespaces[prefix]);
        }
      }
      
      // Add xmi version
      rootEl.setAttribute('xmi:version', '2.0');
      
      // Add schema location if available
      if (model._schemaLocation) {
        rootEl.setAttribute('xsi:schemaLocation', model._schemaLocation);
      }
      
      // Add attributes
      for (const key in model) {
        if (!key.startsWith('_') && typeof model[key] !== 'object') {
          rootEl.setAttribute(key, model[key]);
        }
      }
      
      // Add child elements
      this.serializeObjectChildren(doc, rootEl, model);
      
      doc.appendChild(rootEl);
      return serializer.serializeToString(doc);
    }
    
    /**
     * Serialize child elements of an object
     * @param {Document} doc - The document being created
     * @param {Element} parentEl - The parent element
     * @param {Object} obj - The object whose children to serialize
     */
    static serializeObjectChildren(doc, parentEl, obj) {
      for (const key of obj._children || []) {
        if (Array.isArray(obj[key])) {
          for (const child of obj[key]) {
            if (child._resolvedReference) {
              // Handle resolved references
              const el = doc.createElement(key);
              el.setAttribute('href', child._href);
              if (child._type) {
                el.setAttribute('xsi:type', child._type);
              }
              parentEl.appendChild(el);
            } else if (!child._isReference) {
              // Handle regular child elements
              const el = doc.createElement(key);
              
              // Add attributes
              for (const attrKey in child) {
                if (!attrKey.startsWith('_') && typeof child[attrKey] !== 'object') {
                  el.setAttribute(attrKey, child[attrKey]);
                }
              }
              
              // Add nested children
              this.serializeObjectChildren(doc, el, child);
              
              parentEl.appendChild(el);
            }
          }
        }
      }
    }
  }
  
//   // Export for different module systems
//   if (typeof module !== 'undefined' && module.exports) {
//     module.exports = InstanceLoader;
//   } else {
//     // Browser global
//     window.InstanceLoader = InstanceLoader;
//   }
  
  export default InstanceLoader;