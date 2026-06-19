-- Drop incorrect foreign key constraint
ALTER TABLE reels DROP CONSTRAINT IF EXISTS reels_audio_source_id_fkey;

-- Add correct foreign key constraint pointing to music_library
ALTER TABLE reels 
ADD CONSTRAINT reels_audio_source_id_fkey 
FOREIGN KEY (audio_source_id) 
REFERENCES music_library(id) 
ON DELETE SET NULL;