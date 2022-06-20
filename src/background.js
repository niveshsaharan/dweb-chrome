// Based off github.com/Tagide/chrome-bit-domain-extension
var transferUrl = "";
const dnsPacket = require('dns-packet')
const https = require('https-browserify')
chrome.windows.onRemoved.addListener(function(windowId){

});
function getRandomInt(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min
}
const proxiesHosts = [
	'hi.decentracheck',
]

function sleep(milliseconds, bithost, callback) {
	// synchronous XMLHttpRequests from Chrome extensions are not blocking event handlers. That's why we use this
	// pretty little sleep function to try to get the IP of a .eth domain before the request times out.
	var start = new Date().getTime();
	for (var i = 0; i < 1e7; i++) {
		if (((new Date().getTime() - start) > milliseconds) || (sessionStorage.getItem(bithost) != null)){
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

	if(sent[url.host] || url.host === 'resolver.decentraweb.org') {
		resolveProxy()
	}else {
		sent[url.host] = true;

		if(! hosts[url.host] && proxiesHosts.includes(url.host)){

			const buf = dnsPacket.encode({
				type: 'dns',
				id: getRandomInt(1, 65534),
				flags: dnsPacket.RECURSION_DESIRED,
				questions: [{
					type: 'A',
					name: url.host
				}]
			});

			const options = {
				hostname: 'resolver.decentraweb.org',
				port: 443,
				path: '/dns-query',
				method: 'POST',
				headers: {
					'Content-Type': 'application/dns-message',
					'Accept': 'application/dns-message',
					'Content-Length': Buffer.byteLength(buf)
				}
			}

			const request = https.request(options, (response) => {

				response.on('data', (d) => {
					try {
						const b = dnsPacket?.decode(d);
						const ip = b?.answers?.[0]?.data
						const port = (url.protocol == "https:" ? "443" : "80");
						const access = (url.protocol == "https:" ? "HTTPS" : "PROXY");
						hosts[url.host] = access + " " + ip + ":" + port;
						sessionStorage.setItem(url.host, ip);
					} catch (e) {
						console.log(e)
					}

					resolveProxy()
				});
			})

			request.write(buf)

			request.end()
		}
		else{
			resolveProxy()
		}
	}
	/*

        // get the parts of the url (hostname, port) by creating an 'a' element
        var parser = document.createElement('a');
        parser.href = details.url;

        // Make sure the domain ends with .eth.
        var tld = parser.hostname.slice(-3);
        if (tld != 'decentracheck') {
        //	return;
        };

        var bithost = parser.hostname;
        var port = (parser.protocol == "https:" ? "443" : "80");
        var access = (parser.protocol == "https:" ? "HTTPS" : "PROXY");

        // This .eth domain is not in cache, get the IP from the resolver
        var xhr = new XMLHttpRequest();
        var url = "https://cloudflare-dns.com/dns-query?name="+bithost;
        // synchronous XMLHttpRequest is actually asynchronous
        // check out https://developer.chrome.com/extensions/webRequest
        xhr.open("GET", url, false);
        xhr.onreadystatechange = function() {
            if (xhr.readyState == 4) {
                // Get the ip address returned from the DNS proxy server.
                var bitip = xhr.responseText;
                // store the IP for .eth hostname in the local cache which is reset on each browser restart
                sessionStorage.setItem(bithost, bitip);
            }
        }
        xhr.send();

        //sessionStorage.setItem(bithost, '52.86.254.108');
        // block the request until the new proxy settings are set. Block for up to two seconds.
        sleep(2000, bithost);
            // 503 means were syncing with the ethereum network. Show loading screen.
            if (xhr.status == 503) {
                transferUrl = details.url;
                return {redirectUrl: chrome.extension.getURL("sync.html")};
            }

        // Get the IP from the session storage.
        var bitip = '52.86.254.108' || sessionStorage.getItem(bithost) || '';
        var config = {
            mode: "pac_script",
            pacScript: {
                data: "function FindProxyForURL(url, host) {\n" +
                "  if (dnsDomainIs(host, '"+bithost+"'))\n" +
                "    return '"+access+" "+bitip+":"+port+"';\n" +
                "  return 'DIRECT';\n" +
                "}"
            }
        };
        chrome.proxy.settings.set({value: config, scope: 'regular'},function() {});
        console.log('IP '+bitip+' for '+bithost+' found, config is changed: '+JSON.stringify(config));
    */

}, { urls: ["<all_urls>"] }, ["blocking"]);

function resolveProxy(){
	let data = "function FindProxyForURL(url, host) {\n"
	let code = ``;

	Object.keys(hosts).forEach(host => {
		if(hosts[host]){
			code += "if (dnsDomainIs(host, '" + host + "'))\n{\n" +
				"    return '" + hosts[host] + "';\n}\n";
		}
	});
	data += code + "return 'DIRECT';\n}";

	const config = {
		mode: "pac_script",
		pacScript: {
			data
		}
	};

	chrome.proxy.settings.set({value: config, scope: 'regular'},function() {});
}
