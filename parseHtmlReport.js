const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const xmlbuilder = require('xmlbuilder');

// Function to parse individual spec HTML content and return test results
function parseSpecFileToXML(htmlContent) {
    const $ = cheerio.load(htmlContent);
    let testResults = [];
    let specName = $('h3.spec-head').text().trim();
    let scenarioCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    $('.scenario-container').each((_, elem) => {
        scenarioCount++;
        const scenarioName = $(elem).find('.scenario-head .head').text().trim();
        const statusClass = $(elem).attr('class');
        const status = statusClass.includes('failed') ? 'Failed' : 'Passed';
        if (status === 'Failed') failedCount++;
        if (statusClass.includes('skipped')) skippedCount++;
        const errorMessage = status === 'Failed' ? $(elem).find('.error-message pre').text().trim() : '';
        const stacktrace = status === 'Failed' ? $(elem).find('.stacktrace').text().trim() : '';

        testResults.push({ scenarioName, status, errorMessage, stacktrace });
    });

    return { specName, scenarioCount, failedCount, skippedCount, scenarios: testResults };
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
    xml.att('id', '');
    xml.att('name', 'Gauge Tests');
    xml.att('tests', indexSummary.totalScenarios);
    xml.att('failures', indexSummary.failedCount);
    xml.att('skipped', indexSummary.skippedCount);
    xml.att('errors', '0');
    xml.att('time', '0');

    specResults.forEach(spec => {
        const testsuite = xml.ele('testsuite', {
            name: spec.specName,
            timestamp: new Date().toISOString(),
            hostname: 'localhost',
            tests: spec.scenarioCount,
            failures: spec.failedCount,
            skipped: spec.skippedCount,
            time: '0',
            errors: '0'
        });

        spec.scenarios.forEach(scenario => {
            const testcase = testsuite.ele('testcase', {
                name: scenario.scenarioName,
                classname: spec.specName,
                time: '0'
            });

            if (scenario.status === 'Failed') {
                testcase.ele('failure', {}, scenario.errorMessage).dat(scenario.stacktrace);
            }
        });
    });

    const xmlString = xml.end({ pretty: true });
    fs.writeFileSync(outputPath, xmlString);
    console.log(`JUnit XML report generated at ${outputPath}`);
}

// Main execution
const specsDirectoryPath = '/Users/balaji/Desktop/Gauge-test-project/reports/html-report/specs';
const indexFilePath = '/Users/balaji/Desktop/Gauge-test-project/reports/html-report/index.html';
const xmlOutputPath = '/Users/balaji/Desktop/Gauge-test-project/junit_report.xml';

const indexHtmlContent = fs.readFileSync(indexFilePath, 'utf8');
const indexSummary = parseIndexHtmlToXML(indexHtmlContent);

let allSpecResults = [];
fs.readdirSync(specsDirectoryPath).forEach(file => {
    if (file.endsWith('.html')) {
        const specHtmlContent = fs.readFileSync(path.join(specsDirectoryPath, file), 'utf8');
        allSpecResults.push(parseSpecFileToXML(specHtmlContent));
    }
});

generateJUnitXml(allSpecResults, indexSummary, xmlOutputPath);
