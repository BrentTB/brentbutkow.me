export const copy = {
  heading: 'Terms of service',
  legalese: [
    'By creating an account you acknowledge that the Service is provided on an as-is basis and that continued use constitutes acceptance of these Terms as amended from time to time without individual notice.',
    'You grant us a worldwide, royalty-free, sublicensable licence to host, reproduce, and adapt any content you submit for the purpose of operating, improving, and promoting the Service and the services of our commercial affiliates.',
    'Nothing in this section limits any right you may have under applicable law, except where such limitation is permitted by that law, in which case it does.',
  ],
  marketing: 'Send me personalised offers from Acme and 1,400 selected partners.',
  contact: 'Keep me informed by email, SMS, phone, and post.',
  readout: (count: number) =>
    count === 1 ? '1 marketing consent is active.' : `${count} marketing consents are active.`,
}
