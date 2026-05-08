import boto3
from botocore.client import Config
import os

MINIO_ENDPOINT = "http://localhost:9000"
MINIO_ACCESS_KEY = "minioadmin"
MINIO_SECRET_KEY = "minioadmin"

s3 = boto3.client(
    's3',
    endpoint_url=MINIO_ENDPOINT,
    aws_access_key_id=MINIO_ACCESS_KEY,
    aws_secret_access_key=MINIO_SECRET_KEY,
    config=Config(signature_version='s3v4'),
    region_name='us-east-1'
)

buckets = ['notebooks', 'datasets']

for bucket in buckets:
    try:
        s3.head_bucket(Bucket=bucket)
        print(f"Bucket '{bucket}' already exists.")
    except:
        print(f"Creating bucket '{bucket}'...")
        s3.create_bucket(Bucket=bucket)
        print(f"Bucket '{bucket}' created successfully.")
