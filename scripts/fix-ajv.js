// Script to fix ajv compatibility issues in nested dependencies
const fs = require('fs');
const path = require('path');

const problematicPath = path.join(
  __dirname,
  '..',
  'node_modules',
  'fork-ts-checker-webpack-plugin',
  'node_modules',
  'ajv-keywords',
  'keywords',
  '_formatLimit.js'
);

if (fs.existsSync(problematicPath)) {
  try {
    let content = fs.readFileSync(problematicPath, 'utf8');
    
    // Fix the extendFormats function to handle undefined formats
    // Replace the function with a safe version that works with ajv 8.x
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
    
    // Find and replace the function more carefully
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
      
      // Remove any duplicate code that might have been created
      content = content.replace(/\n\s*if \(!format\.compare\)\s*\n\s*format\.compare = COMPARE_FORMATS\[name\];\s*\n\s*\}\s*\n\s*\}\s*\n\s*if \(!format\.compare\)/g, '\n    if (!format.compare)');
      
      fs.writeFileSync(problematicPath, content, 'utf8');
      console.log('✅ Fixed ajv-keywords compatibility issue');
    }
  } catch (error) {
    console.warn('⚠️  Could not fix ajv-keywords:', error.message);
  }
} else {
  console.log('ℹ️  fork-ts-checker-webpack-plugin nested modules not found (may be hoisted)');
}
