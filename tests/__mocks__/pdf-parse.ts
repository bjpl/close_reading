/**
 * Mock pdf-parse module for testing
 */

const pdfParse = async (_buffer: Buffer) => {
  return {
    text: 'Mock PDF content for testing purposes.',
    numpages: 1,
    info: {
      Title: 'Mock PDF Document',
      Author: 'Test Author',
    },
  };
};

export default pdfParse;
