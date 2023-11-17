const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const xmlbuilder = require('xmlbuilder');
// Function to parse index.html for overall summary
function parseIndexHtml(htmlContent) {
    const $ = cheerio.load(htmlContent);
    const totalSpecs = parseInt($('.total-specs .value').text().trim(), 10);
    console.log(totalSpecs)
    const totalScenarios = parseInt($('.total-scenarios .value').text().trim(), 10);
    console.log(totalScenarios)
    const failedCount = parseInt($('.fail .value').first().text().trim(), 10);
    console.log(failedCount)
    const passedCount = parseInt($('.pass .value').first().text().trim(), 10);
    console.log(passedCount)
    const skippedCount = parseInt($('.skip .value').first().text().trim(), 10);
    console.log(skippedCount)
    return { totalSpecs, totalScenarios, failedCount, passedCount, skippedCount };
}
// Function to parse a single HTML report file
function parseSingleHtmlReport(htmlContent) {
    const $ = cheerio.load(htmlContent);
    let testResults = [];
    // Extracting details for each specification
    $('.spec-name').each((_, elem) => {
        const specName = $(elem).find('.scenarioname').text().trim();
        const specStatus = $(elem).hasClass('failed') ? 'Failed' : 'Passed';
        const specDuration = $(elem).find('.time').text().trim();
        let steps = [];
        let failureDetails = [];
        // Extracting steps and failure details
        $('.step-info').each((_, stepInfo) => {
            const stepStatus = $(stepInfo).hasClass('failed') ? 'Failed' : 'Passed';
            const stepText = $(stepInfo).find('.step-txt span').text().trim();
            steps.push({ text: stepText, status: stepStatus });
            if (stepStatus === 'Failed') {
                const failureMessage = $(stepInfo).find('.error-message pre').text().trim();
                const stacktrace = $(stepInfo).find('.stacktrace').text().trim();
                failureDetails.push({ message: failureMessage, stacktrace });
            }
        });
        testResults.push({ specName, specStatus, specDuration, steps, failureDetails });
        console.log(testResults)
    });
    return testResults;
}
// Function to generate JUnit XML from test results
function generateJUnitXml(allTestResults, summary, outputFilePath) {
    const xml = xmlbuilder.create('testsuites', { encoding: 'UTF-8' });
    xml.att('name', 'Gauge Tests');
    xml.att('tests', summary.totalScenarios);
    xml.att('failures', summary.failedCount);
    xml.att('skipped', summary.skippedCount);
    allTestResults.forEach(spec => {
        const testcase = xml.ele('testcase', {
            name: spec.specName,
            time: spec.specDuration
        });
        if (spec.specStatus === 'Failed') {
            spec.failureDetails.forEach(failure => {
                const failureElem = testcase.ele('failure', { type: 'Failure', message: failure.message });
                failureElem.dat('Stacktrace: ' + failure.stacktrace);
            });
        }
        spec.steps.forEach(step => {
            const stepElem = testcase.ele('step', { status: step.status });
            stepElem.dat(step.text);
        });
    });
    const xmlString = xml.end({ pretty: true });
    fs.writeFileSync(outputFilePath, xmlString);
}
// Recursive function to read all HTML files from the specs subdirectory
function readHtmlFiles(dirPath) {
    let testResults = [];
    const specsFolderPath = path.join(dirPath, 'specs');
    const entries = fs.readdirSync(specsFolderPath, { withFileTypes: true });
    for (const entry of entries) {
        const entryPath = path.join(specsFolderPath, entry.name);
        if (entry.isFile() && entry.name.endsWith('.html')) {
            const htmlContent = fs.readFileSync(entryPath, 'utf8');
            testResults.push(...parseSingleHtmlReport(htmlContent));
        }
    }
    return testResults;
}
// Path to the html-report folder and index.html
const htmlReportFolderPath = '/Users/balaji/Desktop/Gauge-test-project/reports/html-report';
const indexHtmlPath = path.join(htmlReportFolderPath, 'index.html');
// Parse index.html for overall summary
const indexHtmlContent = fs.readFileSync(indexHtmlPath, 'utf8');
const summary = parseIndexHtml(indexHtmlContent);
// Read and parse individual spec HTML files from the specs subfolder
const allTestResults = readHtmlFiles(htmlReportFolderPath);
const xmlOutputPath = '/Users/balaji/Desktop/Gauge-test-project/junit_report.xml';
generateJUnitXml(allTestResults, summary, xmlOutputPath);
console.log('JUnit XML report generated:', xmlOutputPath);