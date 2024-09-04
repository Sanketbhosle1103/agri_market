const fs = require('fs-extra');
const docusign = require('docusign-esign');

const sendEnvelopeForEmbeddedSigning = async (args) => {
  let dsApiClient = new docusign.ApiClient();
  dsApiClient.setBasePath(args.basePath);
  dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + args.accessToken);
  let envelopesApi = new docusign.EnvelopesApi(dsApiClient);
  let results = null;

  let envelope = makeEnvelope(args.envelopeArgs);

  results = await envelopesApi.createEnvelope(args.accountId, {
    envelopeDefinition: envelope,
  });

  let envelopeId = results.envelopeId;

  let viewRequest = makeRecipientViewRequest(args.envelopeArgs);
  results = await envelopesApi.createRecipientView(args.accountId, envelopeId, {
    recipientViewRequest: viewRequest,
  });

  return { envelopeId: envelopeId, redirectUrl: results.url };
};

function makeEnvelope(args) {
  let docPdfBytes = fs.readFileSync(args.docFile);

  let env = new docusign.EnvelopeDefinition();
  env.emailSubject = 'Please sign this contract';

  let doc1 = new docusign.Document();
  let doc1b64 = Buffer.from(docPdfBytes).toString('base64');
  doc1.documentBase64 = doc1b64;
  doc1.name = 'Contract';
  doc1.fileExtension = 'pdf';
  doc1.documentId = '1';

  env.documents = [doc1];

  let signer1 = docusign.Signer.constructFromObject({
    email: args.signerEmail,
    name: args.signerName,
    clientUserId: args.signerClientId,
    recipientId: 1,
  });

  let signHere1 = docusign.SignHere.constructFromObject({
    anchorString: '/sn1/',
    anchorYOffset: '10',
    anchorUnits: 'pixels',
    anchorXOffset: '20',
  });

  let signer1Tabs = docusign.Tabs.constructFromObject({
    signHereTabs: [signHere1],
  });
  signer1.tabs = signer1Tabs;

  let recipients = docusign.Recipients.constructFromObject({
    signers: [signer1],
  });
  env.recipients = recipients;

  env.status = 'sent';

  return env;
}

function makeRecipientViewRequest(args) {
  let viewRequest = new docusign.RecipientViewRequest();
  viewRequest.returnUrl = args.dsReturnUrl + '?state=123';
  viewRequest.authenticationMethod = 'none';
  viewRequest.email = args.signerEmail;
  viewRequest.userName = args.signerName;
  viewRequest.clientUserId = args.signerClientId;
  viewRequest.pingFrequency = 600;
  viewRequest.pingUrl = args.dsPingUrl;

  return viewRequest;
}

module.exports = { sendEnvelopeForEmbeddedSigning, makeEnvelope, makeRecipientViewRequest };
