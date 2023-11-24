const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const xmlbuilder = require('xmlbuilder');

// Function to parse individual spec HTML content and return test results
function parseSpecFileToXML(htmlContent) {
    const $ = cheerio.load(htmlContent);
    let testResults = [];

    // Extracting the spec name
    const specName = $('.spec-head').text().trim();

    $('.scenario-container').each((_, elem) => {
        const scenarioName = $(elem).find('.scenario-head .head').text().trim();
        const statusClass = $(elem).attr('class');
        const status = statusClass.includes('failed') ? 'Failed' : 'Passed';
        const errorMessage = status === 'Failed' ? $(elem).find('.error-message pre').text().trim() : '';
        const stacktrace = status === 'Failed' ? $(elem).find('.stacktrace').text().trim() : '';

        testResults.push({ specName, scenarioName, status, errorMessage, stacktrace });
    });

    return testResults;
}

// Function to parse index.html content for overview
function parseIndexHtmlToXML(htmlContent) {
    const $ = cheerio.load(htmlContent);
    const totalSpecs = $('.total-specs .value').text().trim();
    const totalScenarios = $('.total-scenarios .value').text().trim();
    const failedCount = $('.fail.scenario-stats .value').text().trim();
    const passedCount = $('.pass.scenario-stats .value').text().trim();
    const skippedCount = $('.skip.scenario-stats .value').text().trim();

    return { totalSpecs, totalScenarios, failedCount, passedCount, skippedCount };
}

// Function to generate JUnit XML from test results
function generateJUnitXml(specResults, indexSummary, outputPath) {
    const xml = xmlbuilder.create('testsuites', { encoding: 'UTF-8' });
    xml.att('name', 'Gauge Tests');
    xml.att('tests', indexSummary.totalScenarios);
    xml.att('failures', indexSummary.failedCount);
    xml.att('skipped', indexSummary.skippedCount);

    // Create a testsuite element for each specification
    specResults.forEach(({ specName, scenarioName, status, errorMessage, stacktrace }) => {
        const testsuite = xml.ele('testsuite', {
            name: specName,
            tests: '1', // Each testsuite represents one scenario in this context
            failures: status === 'Failed' ? '1' : '0',
            skipped: status === 'Skipped' ? '1' : '0',
            time: '0' // Replace '0' with actual execution time if available
        });

        const testcase = testsuite.ele('testcase', {
            name: scenarioName,
            classname: specName,
            time: '0' // Replace '0' with actual execution time if available
        });

        if (status === 'Failed') {
            testcase.ele('failure', {}, errorMessage).dat(stacktrace);
        }
    });

    // Write the XML to file
    const xmlString = xml.end({ pretty: true });
    fs.writeFileSync(outputPath, xmlString);
    console.log(`JUnit XML report generated at ${outputPath}`);
}

// Main execution
const specsDirectoryPath = '/Users/balaji/Desktop/Gauge-test-project/reports/html-report/specs'; // Update with your directory path
const indexFilePath = '/Users/balaji/Desktop/Gauge-test-project/reports/html-report/index.html'; // Update with your file path
const xmlOutputPath = '/Users/balaji/Desktop/Gauge-test-project/junit_report.xml'; // Update with your desired output path

const indexHtmlContent = fs.readFileSync(indexFilePath, 'utf8');
const indexSummary = parseIndexHtmlToXML(indexHtmlContent);

let allSpecResults = [];
fs.readdirSync(specsDirectoryPath).forEach(file => {
    if (file.endsWith('.html')) {
        const specHtmlContent = fs.readFileSync(path.join(specsDirectoryPath, file), 'utf8');
        allSpecResults = allSpecResults.concat(parseSpecFileToXML(specHtmlContent));
    }
});

generateJUnitXml(allSpecResults, indexSummary, xmlOutputPath);
