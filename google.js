const express = require('express');
const find = require('lodash/find');
const isNil = require('lodash/isNil');
const { google } = require('googleapis');

const people = google.people('v1');

require('dotenv').config();

const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URL,
);

oauth2Client.on('tokens', (tokens) => {
  if (tokens.refresh_token) {
    // store token
  }
});

google.options({ auth: oauth2Client });

const scopes = ['https://www.googleapis.com/auth/contacts'];
const url = oauth2Client.generateAuthUrl({ access_type: 'offline', scope: scopes });

const app = express();

app.get('/webhook', async (req, res) => res.status(200).json({ succss: true }));

app.get('/authenticate', async (req, res) => {
  console.log('query: ', req.query);
  const { code } = req.query;
  if (!code) {
    return res.redirect(url);
  }
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.credentials = tokens;
  return res.status(200).json({ success: true });
});

// contacts will have the shape of (firstName, lastName, id, [numbers])
// Transform google data to contacts -- [X]
// contacts --> Find user.
//   If no user, create new conect
//   If user, update existing contact

app.get('/contacts', async (req, res) => {
  const { data: groups } = await people.people.connections.list({
    personFields: ['names', 'phoneNumbers', 'emailAddresses'],
    resourceName: 'people/me',
  });
  const contacts = groups.connections.map((connection) => ({
    id: connection.resourceName,
    firstName: connection.names[0].givenName,
    lastName: connection.names[0].familyName,
    numbers: connection.phoneNumbers && connection.phoneNumbers.map((number) => number.value),
  }));
  const foundContact = find(contacts, (contact) => contact.firstName === 'Testing');
  if (isNil(foundContact)) {
    // create new contact
    people.people.createContact({
      requestBody: {
      },
    });
  } else {
    people.people.updateContact({
      resourceName: foundContact.id,
      requestBody: {
        names: [{ givenName: 'Testing', familyName: 'Account' }],
        phoneNumbers: [{ value: '+65 8299 6445' }],
        emailAddresses: [{ value: 'email' }],
      },
    });
    // update contact
  }
  console.log(JSON.stringify(contacts, null, 4));
  return res.status(200).send(JSON.stringify(contacts, null, 4));
});

app.listen(process.env.PORT, () => console.log(`Example app listening at http://localhost:${process.env.PORT}`));
