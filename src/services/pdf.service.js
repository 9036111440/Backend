const fs = require('fs');
const pdfParse = require('pdf-parse');

const extractPdfText = async (filePath) => {

    try {

        const pdfBuffer =
            fs.readFileSync(filePath);

        const data =
            await pdfParse(pdfBuffer);

        return {
            text: data.text,
            pages: data.numpages
        };

    } catch (error) {

        console.error(
            'PDF extraction error:',
            error
        );

        throw new Error(
            'Failed to extract PDF text'
        );

    }
};


module.exports = {
    extractPdfText
};