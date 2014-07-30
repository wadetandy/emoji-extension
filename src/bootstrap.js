/**
  This is the bootstrapping code that sets up the scripts to be used in the
   plugin. It does the following:

  1) Sets up data DOM elements that allow strings to be shared to injected scripts.
  2) Injects the scripts necessary to load the Gmail API into the Gmail script environment.
*/

if (top.document == document) { // Only run this script in the top-most frame (there are multiple frames in Gmail)
	var init = function() {
		// Loads a script
		function loadScript(path, noCORS) {
			var newScript = document.createElement('script');
			newScript.type = 'text/javascript';
			if (!noCORS) {
				// Chrome has a bug where crossOrigin requests can be blocked by a CSP
				// header (https://code.google.com/p/chromium/issues/detail?id=392338).
				// The extension tries to modify the CSP header to allow it, but it can
				// fail if another extension tries to modify the header too.
				newScript.addEventListener('error', loadScript.bind(this, path, true), false);
				newScript.crossOrigin = 'anonymous';
			}
			newScript.src = path;
			document.head.appendChild(newScript);
		}

		Messenger.storeData('originalLocation', location.hash);
		Messenger.storeData('server', server);
		Messenger.storeData('extVersion', extVersion);
		Messenger.storeData('combinedPath', combinedPath);
		if (typeof devRealtimeServer !== 'undefined') {
			Messenger.storeData('devRealtimeServer', devRealtimeServer);
		}


		// Load the initialization script
		loadScript(server + combinedPath + 'combined-' + extVersion + '.js');
	};

	init();
}
