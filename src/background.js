chrome.windows.onRemoved.addListener(function(windowId){

});

function sleep(milliseconds, host, callback) {
	// synchronous XMLHttpRequests from Chrome extensions are not blocking event handlers. That's why we use this
	// pretty little sleep function to try to get the IP of a .eth domain before the request times out.
	let start = new Date().getTime();
	for (let i = 0; i < 1e7; i++) {
		if (((new Date().getTime() - start) > milliseconds) || (hosts[host] != null)){
			break;
		}
	}

	if(typeof callback === "function"){
		callback()
	}
}
let sent = {}
let hosts = {}
// run script when a request is about to occur
chrome.webRequest.onBeforeRequest.addListener(function (details) {
	const url = new URL(details.url)

	if(url && url.host && url.host !== 'resolver.decentraweb.org' && ['http:', 'https:'].includes(url.protocol)){

		if(! hosts[url.host] && ! sent[url.host]){
			sent[url.host] = true;
			// Resolve DNS
			var xhr = new XMLHttpRequest();
			xhr.open("GET", 'https://resolver.decentraweb.org/resolve?name=' + url.host + '&type=A', false);
			xhr.onreadystatechange = function() {
				if (xhr.readyState == 4) {
					// Get the ip address returned from the DNS proxy server.
					let response = JSON.parse(xhr.responseText);

					if(response && response.result && response.result.answers && response.result.answers.length){
						//	sessionStorage.setItem(response.answers[0].name, response.answers[0].data)
						hosts[response.result.answers[0].name] = {ip: response.result.answers[0].data, provider: response.provider};
					}
				}
			}
			xhr.send();
		}

		if(! hosts[url.host]){
			sleep(2000, url.host);
		}

		resolveProxy()
	}

}, { urls: ["<all_urls>"] }, ["blocking"]);

function resolveProxy(){
	const config = {
		mode: "pac_script",
		pacScript: {
			data: getPacScript()
		}
	};

	chrome.proxy.settings.set({value: config, scope: 'regular'},function() {});
}

function  getPacScript() {
	var script = ''
	let j = 0;
	Object.keys(hosts).forEach((host, i) => {
		if(hosts[host].provider === 'dweb'){
			script += (j === 0 ? 'if' : 'else if')
			if (host.indexOf('/') > 0) {
				script += '(shExpMatch(url, "http://' + host + '") || shExpMatch(url, "https://' + host + '"))'
			} else if (host.indexOf('*') > -1) {
				script += '(shExpMatch(host, "' + host + '"))'
			} else {
				script += '(host == "' + host + '")'
			}
			script += '{return "PROXY ' + hosts[host].ip + '; DIRECT";}\n'

			j++;
		}
	})
	if (script) script += 'else { return "DIRECT"; }'

	let data = `
function FindProxyForURL(url,host){
  if(shExpMatch(url, "http:*") || shExpMatch(url, "https:*")){
    ${script}
  } else {
    return "DIRECT";
  }
}
      `
	return data
}
