const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const xmlbuilder = require('xmlbuilder');

// Function to parse individual spec HTML content and return test results
function parseSpecFileToXML(htmlContent) {
    const $ = cheerio.load(htmlContent);
    let testResults = [];

    $('.scenario-container').each((_, elem) => {
        const scenarioName = $(elem).find('.scenario-head .head').text().trim();
        const statusClass = $(elem).attr('class');
        const status = statusClass.includes('failed') ? 'Failed' : 'Passed';
        const errorMessage = status === 'Failed' ? $(elem).find('.error-message pre').text().trim() : '';
        const stacktrace = status === 'Failed' ? $(elem).find('.stacktrace').text().trim() : '';

        testResults.push({ scenarioName, status, errorMessage, stacktrace });
    });

    return testResults;
}

// Function to generate JUnit XML from test results
function generateJUnitXml(specResults, outputPath) {
    const xml = xmlbuilder.create('testsuites', { encoding: 'UTF-8' });
    xml.att('name', 'Gauge Tests');

    specResults.forEach(spec => {
        const testcase = xml.ele('testcase', {
            name: spec.scenarioName,
            classname: 'specs',
            time: '0' // Replace '0' with actual execution time if available
        });

        if (spec.status === 'Failed') {
            const failure = testcase.ele('failure', {}, spec.errorMessage);
            failure.dat(spec.stacktrace);
        }
    });

    const xmlString = xml.end({ pretty: true });
    fs.writeFileSync(outputPath, xmlString);
    console.log(`JUnit XML report generated at ${outputPath}`);
}

// Main execution: reading and parsing spec files
const specsDirectoryPath = '/Users/balaji/Desktop/Gauge-test-project/reports/html-report/specs'; // Update with your directory path
const xmlOutputPath = '/Users/balaji/Desktop/Gauge-test-project/junit_report.xml'; // Update with your desired output path

let allSpecResults = [];
fs.readdirSync(specsDirectoryPath).forEach(file => {
    if (file.endsWith('.html')) {
        const specHtmlContent = fs.readFileSync(path.join(specsDirectoryPath, file), 'utf8');
        allSpecResults = allSpecResults.concat(parseSpecFileToXML(specHtmlContent));
    }
});

generateJUnitXml(allSpecResults, xmlOutputPath);
