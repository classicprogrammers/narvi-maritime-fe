// Script to fix ajv compatibility issues in nested dependencies
const fs = require('fs');
const path = require('path');

// Find all instances of _formatLimit.js in nested node_modules
function findFormatLimitFiles(rootDir, fileList = [], depth = 0) {
  // Limit depth to avoid infinite recursion
  if (depth > 10) return fileList;
  
  try {
    const entries = fs.readdirSync(rootDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(rootDir, entry.name);
      
      if (entry.isDirectory()) {
        // Check if this is an ajv-keywords directory
        if (entry.name === 'ajv-keywords') {
          const formatLimitPath = path.join(fullPath, 'keywords', '_formatLimit.js');
          if (fs.existsSync(formatLimitPath)) {
            fileList.push(formatLimitPath);
          }
        }
        
        // Recursively search in node_modules directories
        if (entry.name === 'node_modules' || depth === 0) {
          findFormatLimitFiles(fullPath, fileList, depth + 1);
        }
      }
    }
  } catch (e) {
    // Skip if can't read directory
  }
  
  return fileList;
}

// Fix a single _formatLimit.js file
function fixFormatLimitFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if already fixed
    if (content.includes('ajv._formats || ajv.formats || {}')) {
      return false; // Already fixed
    }
    
    // Fix the extendFormats function to handle undefined formats
    const safeFunction = `function extendFormats(ajv) {
  // In ajv 8.x, formats might be stored differently or not exist
  var formats = ajv._formats || ajv.formats || {};
  if (!ajv._formats && !ajv.formats) {
    ajv._formats = formats;
  }
  for (var name in COMPARE_FORMATS) {
    try {
      var format = formats[name];
      // the last condition is needed if it's RegExp from another window
      if (!format || typeof format != 'object' || format instanceof RegExp || !format.validate) {
        format = formats[name] = { validate: format || function() { return true; } };
      }
      if (format && !format.compare) {
        format.compare = COMPARE_FORMATS[name];
      }
    } catch (e) {
      // Silently skip if format doesn't exist
      formats[name] = { validate: function() { return true; }, compare: COMPARE_FORMATS[name] };
    }
  }
}`;
    
    // Find and replace the function
    const functionStart = content.indexOf('function extendFormats(ajv)');
    if (functionStart !== -1) {
      // Find the end of the function (next function or end of file)
      const nextFunction = content.indexOf('\n\nfunction ', functionStart + 1);
      const functionEnd = nextFunction !== -1 ? nextFunction : content.length;
      
      // Extract everything before and after
      const before = content.substring(0, functionStart);
      const after = content.substring(functionEnd);
      
      // Reconstruct with the fixed function
      content = before + safeFunction + '\n\n' + after;
      
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    }
  } catch (error) {
    console.warn(`⚠️  Could not fix ${filePath}:`, error.message);
  }
  return false;
}

// Main execution
const nodeModulesPath = path.join(__dirname, '..', 'node_modules');
const formatLimitFiles = findFormatLimitFiles(nodeModulesPath);

if (formatLimitFiles.length === 0) {
  console.log('ℹ️  No ajv-keywords _formatLimit.js files found in nested modules');
} else {
  let fixedCount = 0;
  for (const filePath of formatLimitFiles) {
    if (fixFormatLimitFile(filePath)) {
      fixedCount++;
      console.log(`✅ Fixed: ${path.relative(nodeModulesPath, filePath)}`);
    }
  }
  if (fixedCount > 0) {
    console.log(`✅ Fixed ${fixedCount} ajv-keywords compatibility issue(s)`);
  } else {
    console.log('ℹ️  All ajv-keywords files already fixed');
  }
}
