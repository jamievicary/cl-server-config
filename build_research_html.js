const {google} = require('googleapis');
const fs = require('fs');
const sheets = google.sheets('v4');


const execSync = require('child_process').execSync;


//https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/batchGet

// Set testing or production API key
//var api_key_test = 'AIzaSyAnVtjnSaDRbK6gFfMT4WGTjMsGeayetQc';
//var api_key_production = 'AIzaSyAwS5_NRmOWVflqxz8WtxmShSBBxIGX6eQ';
//var api_key = (location.hostname == '127.0.0.1' ? api_key_test : api_key_production);
var api_key = 'AIzaSyBM-uRP07AYXP_5e5myKTL0VoJsWswSoZs';

// Identifier for the research database spreadsheet
var spreadsheet_id = '1fZQS-MFG6Dvk7TtqQOjC6-F7RLXZmQLlDUQ72cSgEfw';

var data = {};
var h = 'h2';

var request = {
    spreadsheetId: spreadsheet_id,
    ranges: ["Papers", "Talks", "Updates", "People", "Public"],
    valueRenderOption: 'UNFORMATTED_VALUE',
    dateTimeRenderOption: 'FORMATTED_STRING',
    auth: api_key
};

var ranges = ["Papers", "Talks", "Updates", "People", "Public"];

function preprocess(raw_data) {

    var results = raw_data.valueRanges;
    for (var i = 0; i < results.length; i++) {
        data[ranges[i].toLowerCase()] = process_spreadsheet_data(results[i].values);
    }

}

function process_spreadsheet_data(response) {

    if (!response) return null;
    var header = response[0];
    if (!header) return;
    for (var i = 0; i < header.length; i++) {
        header[i] = header[i].toLowerCase().replace(/ /g, "_");
    }
    var array = [];
    for (var row = 1; row < response.length; row++) {
        var obj = {};
        for (var field = 0; field < header.length; field++) {
            obj[header[field]] = response[row][field];
        }
        array.push(obj);
    }
    return array;

}

function format_journal(paper) {

    var ref = '';
    if (paper.booktitle) {
        ref += 'In <i>' + paper.booktitle + '</i>, '
    }
    if (paper.journal) {
        ref += paper.journal;
        if (paper.volume) ref += ' <b>' + paper.volume + '</b>';
        if (paper.issue) ref += (paper.volume ? '' : ' ') + '(' + paper.issue + ')';
        if (paper.pagerange) ref += ', ' + paper.pagerange;
    }
    if (paper.pages && !(paper.journal && paper.pagerange)) {
        ref += (paper.journal ? ', ' : '') + paper.pages + ' pages';
    }
    ref += (ref ? '.' : '');
    var link_html = '';
    if (paper.arxiv) link_html = '<a href="http://arxiv.org/abs/' + paper.arxiv + '">arXiv:' + paper.arxiv + '</a>'
    if (paper.doi) link_html += (paper.arxiv ? ', ' : '')
        + '<a href="http://doi.org/' + paper.doi.trim() + '">doi:' + paper.doi.trim() + '</a>';
    if (link_html) ref += (ref ? ' ' : '') + link_html + '.';
    if (paper.note) ref += ' ' + ensure_final_dot(paper.note)
    return ref;

}

function ensure_final_dot(string) {
    if (string.length == 0) return string;
    if (string[string.length - 1] == '.') return string;
    return string + '.';
}


function insert_person_links(str) {

    for (var i=0; i<data.people.length; i++) {
        var person = data.people[i];
        var link = '<a href="' + person.url + '">' + person.name + '</a>';
        str = str.replace(person.name, link);
    }
    return str;

}

function process_papers() {

    console.log('Entered process_papers');
    var html = '<' + h + ' class="jamie" id="heading-papers">Papers</' + h + '>\n';
    for (var i = data.papers.length - 1; i >= 0; i--) {
        var paper = data.papers[i];
        var paper_html = '<div class="jamiepaper">'
            + '[P' + (i + 1) + '] '
            + paper.authors + ' (' + paper.year + '). '
            + '"' + paper.title + '". '
            + format_journal(paper)
            + "</div>\n";
        paper_html = insert_person_links(paper_html);
        html += paper_html;
    }
    local_write_file('output_papers.html', html);

}

function process_public() {

    console.log('Entered process_public');
    var html = '<' + h + ' class="jamie" id="heading-public">Public engagement</' + h + '>\n';
    html += insert_person_links('<p>I find public outreach work exciting and fulfilling, and consider it an important part of an academic career.'
        + ' With David Reutter, I'
        + ' have developed a public engagement workshop, called <i>Qubit.Zone</i>, where participants can explore exciting quantum ideas&mdash;'
        + 'including superposition, entanglement and teleportation&mdash;using hand-held electronic qubit simulators. A list of all my group\'s'
        + ' public engagement activity is given below. If you would be interested in having a <i>Qubit.Zone</i> workshop as part of your event,'
        + ' get in touch!</p>');
    for (var i = data.public.length - 1; i >= 0; i--) {
        var event = data.public[i];
        var date = new Date(event.date);
        var event_html = '<div class="jamiepublic">'
            + '[E' + (i + 1) + '] '
            + monthNames[date.getMonth()] + " " + date.getFullYear() + ". "
            + event.description
            + "</div>\n";
        event_html = insert_person_links(event_html);
        html += event_html;
    }
    local_write_file('output_public.html', html);

}

var monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
function process_talks() {

    console.log('Entered process_talks');
    var html = '<' + h + ' class="jamie" id="heading-talks">Talks</' + h + '>';
    for (var i = data.talks.length - 1; i >= 0; i--) {
        var talk = data.talks[i];
        var date = new Date(talk.date);
        var talk_html = "<div class='jamietalk"
            + "'> [T" + (i+1) + "] "
            + monthNames[date.getMonth()] + " " + date.getFullYear()
            + ". ''" + talk.title + "'', "
            + (talk.url == "" ? talk.event : "<a href='" + talk.url + "'>" + talk.event + '</a>')
            + (talk.location ? ", " + talk.location : '')
            + ". "
            + (talk.notes || "")
            + (talk.invited ? " (invited)" : "")
            + (talk.public ? " (public)" : "")
            + "</div>\n";
        html += talk_html;
    }
    local_write_file('output_talks.html', html);

}

function process_updates() {

    console.log('Entered process_updates');

    var now = new Date();
    var html;
    var html_future = '<' + h + ' class="jamie" id="heading-future">The future</' + h + '>'
        + '\n<ul id="ul-future">';
    var html_past = '\n\n<' + h + ' class="jamie" id="heading-past">The past</' + h + '>' + '<ul id="ul-past">';

    data.updates.map(a => {
        a.js_date = new Date(a.date);
    });

    // Sort the updates
    data.updates.sort((a,b) => {
        if (a.js_date < b.js_date) return +1;
        return -1;
    });

    var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    var now = new Date;
    var list = [];
    for (var i = 0; i < data.updates.length; i++) {
        var update = data.updates[i];
        var old = now - update.js_date > 1000 * 60 * 60 * 24 * 365;
        var display_date = months[update.js_date.getMonth()] + ' ' + update.js_date.getFullYear();
        var update_html = '\n<li class="jamieupdate'
            + (old ? ' old' : '') + '" '
            + 'style="' + (old ? 'display:none;' : 'display:auto;')
            + '"><b>' + display_date + '.</b> ' + insert_person_links(update.text) + '</li>';
        if (update.js_date < now) {
            html_past += update_html;
        } else {
            html_future += update_html;
        }
    }

    html_past += '\n</ul>';
    html_future += '\n</ul>';

    html_on_click = '\n\n<script>\nfunction on_click_button() {'
    + '\n    var b = document.getElementById("button-lessmore");'
    + '\n    var less = (b.getAttribute("current") == "less");'
    + '\n    b.innerHTML = less ? "Show more..." : "Show less...";'
    + '\n    b.setAttribute("current", less ? "more" : "less");'
    + '\n    var elts = document.querySelectorAll("li.old");'
    + '\n    for (var i=0; i<elts.length; i++) {'
    + '\n        elts[i].style.cssText = less ? "display:none;" : "display:auto;";'
    + '\n    }'
    + '\n}'
    + '\n</script>';

    html_button = '\n\n<button id="button-lessmore" type="button" current="more" onclick="on_click_button()">Show more...</button>';

    var html = html_future + html_past + html_on_click + html_button;
    local_write_file('output_updates.html', html);

}

function local_write_file(filename, data) {

    fs.writeFileSync('./output/' + filename, data, 'utf8');

}

function concatenate_cambridge() {

    var header  = fs.readFileSync('./input/cambridge_header.html', 'utf8');
    var updates = fs.readFileSync('./output/output_updates.html', 'utf8');
    var papers  = fs.readFileSync('./output/output_papers.html', 'utf8');
    var talks   = fs.readFileSync('./output/output_talks.html', 'utf8');
    var public  = fs.readFileSync('./output/output_public.html', 'utf8');
    var footer  = fs.readFileSync('./input/cambridge_footer.html', 'utf8');
    var entire  = header
         + "\n" + updates
         + "\n" + papers
         + "\n" + talks
         + "\n" + public
         + "\n" + footer;
    local_write_file("cambridge_index.html", entire);

}

module.exports.build_files_async = (continuation) => {

	console.log("build_files entered");
    sheets.spreadsheets.values.batchGet(request, function(err, response) {
        if (err) {
			console.log("Error contacting google sheets");
          	console.error(err);
         	return;
        }

        console.log('Preprocessing');
        preprocess(response.data);
        //process_bio();
        process_updates();
        process_papers();
        process_talks();
        process_public();
        concatenate_cambridge();
        console.log("build_files done");
        continuation();
        /*
        var result = copy_files('vicaryjo@wallace.cs.bham.ac.uk', '~/public_html');
        result += '\n\n' + copy_files('jamv@linux.cs.ox.ac.uk', '/fs/website/people/jamie.vicary');
        */
    });    

}
