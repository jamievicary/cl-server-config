const express = require('express');

const app = express();

var child_process = require('child_process');

const build_html = require('./build_research_html');

app.use('/files', express.static('../public'));

app.get('/', (req, res) => {
	console.log('Received message "/"');
	res.status(200);
	res.send('Server up.');
	console.log('Request "/", responding that server is up.');
});

app.all('/pull', (req, res) => {
	console.log('Received message "/pull"');
	var result = child_process.execSync('git pull');
	res.status(200);
	res.send('<html><body>' + result + '</body></html>');
	console.log(result);
});

var server = app.listen(80, () => console.log('Node server listening on port 80'));

// Use a timeout to only update after research data has not changed for 1 second
var update_timeout = null;
app.all('/update_research', (req, res) => {
	console.log('Received message "/update_research"');
	if (update_timeout != null) clearTimeout(update_timeout);
	update_timeout = setTimeout(update_research, 1000);
    res.status(200);
    res.send();
});

function update_research() {
	build_html.build_files_async(function() {
		/*
		console.log('About to copy to bham');
		var result = copy_files('vicaryjo@wallace.cs.bham.ac.uk:public_html');
		*/
		console.log('About to copy to camb');
		var result = child_process.execSync("scp -rp output/cambridge_index.html jv258@slogin-serv.cl.cam.ac.uk:~/public_html/index.html")
		console.log('About to copy to ox');
		result += '\n\n' + copy_files('jamv@linux.cs.ox.ac.uk:/fs/website/people/jamie.vicary');
		console.log('Done');
		console.log(result);
	});
}

app.all('/update_syco', (req, res) => {
	console.log('Received message "/update_syco"');
	//var result = child_process.execSync("ssh vicaryjo@wallace.cs.bham.ac.uk 'cd ~/public_html/syco;git pull'");
	//var result = child_process.execSync("ssh vicaryjo@wallace.cs.bham.ac.uk 'cd /bham/htdocs/events/syco;git pull'");
	//var result = child_process.execSync("cd ~/syco;git pull;cp -ru ~/syco /mnt/events");
	var result = child_process.execSync("cd ~/syco;git pull;rsync -rv --size-only --exclude='.git' ~/syco /mnt/events").toString();
	res.status(200);
	res.send(text_to_html(result));
	console.log(result);
});

app.all('/update_owls', (req, res) => {
	console.log('Received message "/update_owls"');
	//var result = child_process.execSync("ssh vicaryjo@wallace.cs.bham.ac.uk 'cd ~/public_html/syco;git pull'");
	//var result = child_process.execSync("ssh vicaryjo@wallace.cs.bham.ac.uk 'cd public_html/owls;git pull'");
	var result = child_process.execSync("cd ~/owls;git pull;rsync -rv --size-only --exclude='.git' ~/owls /mnt/events").toString();
	res.status(200);
	res.send(text_to_html(result));
	console.log(result);
});

/*
app.all('/update_bham_theory', (req, res) => {
	console.log('Received message "/update_bham_theory"');
	//var result = child_process.execSync("ssh vicaryjo@wallace.cs.bham.ac.uk 'cd ~/public_html/syco;git pull'");
	var result = child_process.execSync("ssh vicaryjo@wallace.cs.bham.ac.uk 'cd /bham/htdocs/website/research/groupings/theory;git pull'");
	res.status(200);
	res.send(result);
	console.log(result);
});
*/

function copy_files(target) {
    var command = 'scp -rp output ' + target;
    return child_process.execSync(command);
}

function text_to_html(str) {
	return "<html><body>" + str.split('\n').join('\n<br>\n') + "</body></html>"
}

process.on('SIGINT', function() {
	console.log('Initiating server shutdown');
	/*
	server.close(function() {
		console.log('Closed express server');
	});
	*/
	process.exit();
});

// Trigger update research immediately
//update_research();
