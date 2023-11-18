const fs = require('fs');
const cheerio = require('cheerio');
const xmlbuilder = require('xmlbuilder');
const path = require('path');

// Function to parse index.html for overall summary
function parseIndexHtml(htmlContent) {
    const $ = cheerio.load(htmlContent);
    const totalSpecs = parseInt($('.total-specs .value').text().trim(), 10);
    const totalScenarios = parseInt($('.total-scenarios .value').text().trim(), 10);
    const failedCount = parseInt($('.fail .value').first().text().trim(), 10);
    const passedCount = parseInt($('.pass .value').first().text().trim(), 10);
    const skippedCount = parseInt($('.skip .value').first().text().trim(), 10);

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

        testResults.push({ specName, specStatus, specDuration });
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
            testcase.ele('failure', {}, 'Some tests failed');
        }
    });

    // Add a custom property to the XML to include summary details
    const properties = xml.ele('properties');
    properties.ele('property', { name: 'totalSpecs', value: summary.totalSpecs });
    properties.ele('property', { name: 'totalScenarios', value: summary.totalScenarios });
    properties.ele('property', { name: 'passedScenarios', value: summary.passedCount });
    properties.ele('property', { name: 'failedScenarios', value: summary.failedCount });
    properties.ele('property', { name: 'skippedScenarios', value: summary.skippedCount });

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
