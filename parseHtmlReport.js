const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const xmlbuilder = require('xmlbuilder');

// Function to parse individual spec HTML content and return test results
function parseSpecFileToXML(htmlContent) {
    const $ = cheerio.load(htmlContent);
    let testResults = [];
    let specName = $('h3.spec-head').text().trim();

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

// Function to generate JUnit XML from test results
function generateJUnitXml(allSpecResults, outputPath) {
    const xml = xmlbuilder.create('testsuites', { encoding: 'UTF-8' });

    allSpecResults.forEach(specResults => {
        if (specResults.length > 0) {
            const testsuite = xml.ele('testsuite', {
                name: specResults[0].specName,
                tests: specResults.length,
                failures: specResults.filter(r => r.status === 'Failed').length,
                skipped: specResults.filter(r => r.status === 'Skipped').length,
                time: '0'
            });

            specResults.forEach(test => {
                const testcase = testsuite.ele('testcase', {
                    name: test.scenarioName,
                    classname: test.specName,
                    time: '0'
                });

                if (test.status === 'Failed') {
                    testcase.ele('failure', {}, test.errorMessage).dat(test.stacktrace);
                }
            });
        }
    });

    const xmlString = xml.end({ pretty: true });
    fs.writeFileSync(outputPath, xmlString);
    console.log(`JUnit XML report generated at ${outputPath}`);
}

// Main execution
const specsDirectoryPath = '/path/to/your/gauge/project/reports/html-report/specs'; // Update this path
const xmlOutputPath = '/path/to/your/gauge/project/junit_report.xml'; // Update this path

let allSpecResults = [];
fs.readdirSync(specsDirectoryPath).forEach(file => {
    if (file.endsWith('.html')) {
        const specHtmlContent = fs.readFileSync(path.join(specsDirectoryPath, file), 'utf8');
        allSpecResults = allSpecResults.concat(parseSpecFileToXML(specHtmlContent));
    }
});

generateJUnitXml(allSpecResults, xmlOutputPath);
