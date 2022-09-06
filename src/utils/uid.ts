import fingerprint32 from 'hash-sum';
export default str =>
{
  return Buffer
    .from(
      fingerprint32(str)
        .toString(16),
      'hex')
    .toString('hex');
};