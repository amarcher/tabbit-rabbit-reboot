// Android App Links verification file.
// SHA-256 fingerprint must match the Android signing certificate managed by EAS.
// After running `eas credentials --platform android`, get the fingerprint and update below.
// Run: eas credentials --platform android  (look for "SHA-256 Fingerprint")
const SHA256_FINGERPRINT = 'REPLACE_WITH_SHA256_FROM_EAS_CREDENTIALS';

module.exports = function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json([
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: 'com.tabbitrabbit.app',
        sha256_cert_fingerprints: [SHA256_FINGERPRINT],
      },
    },
  ]);
};
