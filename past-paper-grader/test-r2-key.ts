import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

const baseKey = "3d5098be335f6f63e00a9dd13587f1f";
const secretKey = "f15e146652ef8c19e6fd2fb83e0f538bc8229055e4c4bfbafe70c6ff1e85b15b";
const endpoint = "https://c3c985ac8a0f141a39b4d518ce9e1559.r2.cloudflarestorage.com";
const BUCKET_NAME = "past-papers";

async function testKey(accessKeyId: string) {
  const s3 = new S3Client({
    endpoint,
    region: "auto",
    credentials: {
      accessKeyId,
      secretAccessKey: secretKey,
    },
  });

  try {
    await s3.send(new ListObjectsV2Command({ Bucket: BUCKET_NAME, MaxKeys: 1 }));
    console.log(`SUCCESS! Valid key found: ${accessKeyId}`);
    return true;
  } catch (error: any) {
    if (error.name !== "InvalidArgument" && error.name !== "InvalidAccessKeyId" && error.name !== "SignatureDoesNotMatch") {
      console.log(`Failed with unexpected error for ${accessKeyId}: ${error.name} - ${error.message}`);
    }
    return false;
  }
}

async function run() {
  const hexChars = "0123456789abcdef";

  console.log("Testing appending a character...");
  for (const char of hexChars) {
    if (await testKey(baseKey + char)) process.exit(0);
  }

  console.log("Testing prepending a character...");
  for (const char of hexChars) {
    if (await testKey(char + baseKey)) process.exit(0);
  }

  console.log("Could not find the valid key.");
}

run();
