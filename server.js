const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs-extra');
const path = require('path');
const docusign = require('docusign-esign');
const { sendEnvelopeForEmbeddedSigning } = require('./docusignHelper');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.set('view engine', 'ejs');

// Step 1: Serve the contract form page
app.get('/', (req, res) => {
  res.render('contractForm');
});

// Step 2: Handle form submission and signature upload
app.post('/create-contract', upload.single('signatureImage'), async (req, res) => {
  const { farmerName, buyerName, contractDetails } = req.body;
  const signatureImagePath = req.file.path;

  // Save contract details and signature path in session or database

  res.render('reviewContract', { farmerName, buyerName, contractDetails, signatureImagePath });
});

// Step 3: Handle contract review and signing process
app.post('/sign-contract', async (req, res) => {
  const { farmerName, buyerName, contractDetails, signatureImagePath } = req.body;

  // Create the envelope and send it for embedded signing
  const envelopeArgs = {
    signerEmail: 'user@example.com',
    signerName: farmerName,
    signerClientId: '1000',
    docFile: path.join(__dirname, 'contract.pdf'),
    signatureImage: fs.readFileSync(signatureImagePath, 'base64')
  };

  const args = {
    basePath: 'https://demo.docusign.net/',
    accessToken: 'YOUR_ACCESS_TOKEN',
    accountId: 'YOUR_ACCOUNT_ID',
    envelopeArgs: envelopeArgs
  };

  try {
    const { envelopeId, redirectUrl } = await sendEnvelopeForEmbeddedSigning(args);
    res.redirect(redirectUrl);
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred during the signing process.');
  }
});

// Step 4: Display the signed contract and allow download
app.get('/contract-signed', (req, res) => {
  const { pdfPath } = req.query; // PDF path would be returned by DocuSign

  res.render('displayContract', { pdfPath });
});

// Download the signed contract as PDF
app.get('/download-contract', (req, res) => {
  const { pdfPath } = req.query;

  res.download(pdfPath, 'signed_contract.pdf');
});

app.listen(3000, () => console.log('Server started on http://localhost:3000'));
