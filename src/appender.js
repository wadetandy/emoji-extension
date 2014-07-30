(function() {
  'use strict';

  var attr_blacklist = ['crossorigin'];

  // see extensions/common/js/core/appenderSetup.js
  // The injected script can request for the extension to append an element
  // to the page. This lets the page CSP rules be bypassed even if we didn't
  // rewrite the CSP header.
  document.addEventListener('extensionAppendRequest', function(event) {
    var node = event.detail;
    var el = document.createElement(node.tagName);
    for (var attrName in node.attributes) {
      if (node.attributes.hasOwnProperty(attrName) &&
          attr_blacklist.indexOf(attrName) == -1) {
        el.setAttribute(attrName, node.attributes[attrName]);
      }
    }
    el.innerHTML = node.innerHTML;
    event.target.appendChild(el);
  }, false);
})();
