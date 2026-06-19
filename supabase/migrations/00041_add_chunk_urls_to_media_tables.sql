-- Add chunk_urls column to posts table
alter table posts add column if not exists chunk_urls text;

-- Add chunk_urls column to reels table
alter table reels add column if not exists chunk_urls text;

-- Add chunk_urls column to stories table
alter table stories add column if not exists chunk_urls text;

comment on column posts.chunk_urls is 'JSON array of chunk URLs for large video files (>50MB)';
comment on column reels.chunk_urls is 'JSON array of chunk URLs for large video files (>50MB)';
comment on column stories.chunk_urls is 'JSON array of chunk URLs for large video files (>50MB)';
