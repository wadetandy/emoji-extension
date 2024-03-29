var connections = {};
var connectionList = [];

var doc = chrome.extension.getBackgroundPage().document;

function setupRequestInterceptor() {
	// Add ourselves to any Content Security Policy whitelist headers.

	var hosts = server+" ";
	// google jsapi and sharing widgets
	hosts += "https://*.google.com ";
	hosts += "https://*.linkedin.com ";
	var iframeHosts = "https://*.facebook.com https://*.twitter.com https://twitter.com ";

	chrome.webRequest.onHeadersReceived.addListener(function(details) {
		var replaceHeaders = false;
		details.responseHeaders.forEach(function(header) {
			if (header.name.match(/content-security-policy|^x-.*-csp(-report-only)?$/i)) {
				replaceHeaders = true;

				console.log('found a CSP header, modifying it', details, header);

				['default-src'].forEach(function(section) {
					header.value = header.value.replace(section+" ", section+" 'unsafe-inline' 'unsafe-eval' "+hosts+iframeHosts);
				});
				['style-src'].forEach(function(section) {
					header.value = header.value.replace(section+" ", section+" 'unsafe-inline' 'unsafe-eval' "+hosts);
				});
				['script-src'].forEach(function(section) {
					header.value = header.value.replace(section+" ", section+" 'unsafe-eval' "+hosts);
				});
				['frame-src','child-src'].forEach(function(section) {
					header.value = header.value.replace(section+" ", section+" "+hosts+iframeHosts);
				});
				['connect-src','img-src','media-src','font-src'].forEach(function(section) {
					header.value = header.value.replace(section+" ", section+" "+hosts);
				});
			}
		});
		if (replaceHeaders) {
			return {responseHeaders: details.responseHeaders};
		}
	}, {urls:["*://mail.google.com/*"],types:["main_frame"]}, ["responseHeaders", "blocking"]);
}

function cleanupConnections(){
	if(connectionList && connectionList.length > 0){
		for(var ii=0; ii<connectionList.length; ii++){
			try{
				var numIframes = connectionList[ii].Streak.getNumberOfIframes();
				if(numIframes > 1){
					console.log('more than one internal iframe found, resetting');
					connectionList[ii].reset();
				}
			}
			catch(err){}
		}
	}

	setTimeout(cleanupConnections, 30*1000);
}

function cleanupExtraIFrames(){
	var ii, jj, iframes = doc.body.getElementsByTagName('iframe');
	var iframesToRemove = [];

	for(ii=0; ii<iframes.length; ii++){
		for(jj=0; jj<connectionList.length; jj++){
			if(connectionList[jj].iframe === iframes[ii]){
				break;
			}
		}

		if(jj === connectionList.length){
			iframesToRemove.push(iframes[ii]);
		}
	}

	if(iframesToRemove.length > 0){
		console.log('extra iframes found');
	}

	for(ii=0; ii<iframesToRemove.length; ii++){
		doc.body.removeChild(iframesToRemove[ii]);
	}

	setTimeout(cleanupExtraIFrames, 30*1000);
}

function setupPort(port){
	var connection = {
		port: port
	};

	connection.reset = function(){
		port.postMessage({
			op: "channelConnectResetTeardown"
		});

		try {
			connection.socket.close();
		}
		catch(err){

		}

		port.postMessage({
			op: "channelConnectResetReup"
		});
	};

	var channelMessage = function(obj){
		port.postMessage({
			op: "channelConnectMessage",
			data: obj
		});
	};

	connections[port.sender.tab.id] = connection;
	connectionList.push(connection);

	port.onMessage.addListener(function(request) {
		switch (request.op) {
		case "channelSetup":
			connection.iframe = doc.createElement('iframe');
			//var scriptSource = (request.data.isDevServer ? request.data.src : "channel.js");

			var scriptSource = "channel.js";

			connection.iframe.onload = function() {
					var fw = connection.iframe.contentWindow;
					var fd = connection.iframe.contentDocument;
					var gScript = fd.createElement('script');
					gScript.src = scriptSource;

					gScript.onload = function() {
						connection.Streak = new fw.BackgroundStreak();
						connection.Streak.channelSetup(request.data.src, function(){
							port.postMessage({
								op: 'channelSetupReturn',
								id: request.id
							});
						});
					};

					fd.head.appendChild(gScript);
				};

			doc.body.appendChild(connection.iframe);
			break;

		case "channelConnect":
			connection.Streak.channelConnect(request.data, channelMessage);
			break;
		case "extensionListRequest":
			chrome.management.getAll(function(list){
				if(!list || list.length < 1){
					port.postMessage({
						op: "extensionListResponse",
						id: request.id
					});
					return;
				}

				port.postMessage({
					op: "extensionListResponse",
					id: request.id,
					data: list
				});
			});
			break;
		}
	});

	//cleanup on disconnect
	port.onDisconnect.addListener(function() {
		try {
			connection.Streak.close();
		}
		catch(err){

		}

		try {
			connection.iframe.remove();
		} catch (err) {

		}

		var connectionIndex = connectionList.indexOf(connection);
		if(connectionIndex > -1){
			connectionList.splice(connectionIndex, 1);
		}

		connection = null;
		delete connections[port.sender.tab.id];
	});


}

chrome.extension.onConnect.addListener(function(aPort) {
	setupPort(aPort);
});

setupRequestInterceptor();
cleanupConnections();
cleanupExtraIFrames();
