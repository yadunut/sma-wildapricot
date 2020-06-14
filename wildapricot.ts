import {NextApiRequest, NextApiResponse} from 'next';
import isNil from 'lodash/isNil';
import find from 'lodash/find';
import axios from 'axios';
import qs from 'qs';

interface Contact {
  firstName: string,
  lastName: string,
  email: string,
  phone: string,

}

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405);
  }
  const apiKey = process.env.API_KEY;
  const accountID = process.env.ACCOUNT_ID;
  if (isNil(apiKey) || isNil(accountID)) {
    return res.status(400).json({error: 'API_KEY or ACCOUNT_ID not set'});
  }

  const contactID = req.body?.Parameters["Contact.Id"];
  if (isNil(contactID)) {
    return res.status(400).json({error: 'Invalid contactID'});
  }

  const {accessToken, error: accessTokenError} = await getAccessToken(apiKey);
  if (!isNil(accessTokenError)) {
    return res.status(400).json(accessTokenError);
  }

  const {contact, error: contactError} = await getContact(accessToken, accountID, contactID);
  if (!isNil(contactError)) {
    return res.status(400).json(accessTokenError);
  }

  res.statusCode = 200
  res.json({ accessToken, contact})
}

async function getAccessToken(apiKey: String) {
  const Authorization = `Basic ` + Buffer.from(`APIKEY:${apiKey}`).toString('base64');
  const data = qs.stringify({ grant_type: 'client_credentials', scope: 'auto' });
  try {
    const {data: response} = await axios({
      url: 'https://oauth.wildapricot.org/auth/token',
      method: 'POST',
      headers: {
        Authorization,
        'content-type': 'application/x-www-form-urlencoded',
      },
      data,
    });
    const accessToken = response?.access_token;
    if (isNil(accessToken)) {
      return {accessToken: null, error: 'accessToken is null'};
    }
    return {accessToken,error: null};
  } catch(error) {
    return {accessToken: null, error: error};
  }
}

async function getContact(accessToken: String, accountID: String, contactID: String) {
  try {
    const {data} = await axios({
      url: `https://api.wildapricot.org/v2.2/accounts/${accountID}/Contacts/${contactID}`,
        method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    return {
      contact: {
        firstName: data.FirstName,
        lastName: data.LastName,
        email: data.Email,
        phone: findIn(data.FieldValues, 'Phone'),
      },
      error: null
    };
  } catch(error) {
    return {error: error, contact: null};
  }
}

function findIn(fieldValues: any[], key: String) {
  const field = find(fieldValues, field => field.SystemCode === key);
  return field?.Value;
};
