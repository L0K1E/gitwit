-- Create a function to search for code chunks
create or replace function match_code_chunks(
  query_embedding vector(1536), -- 1536 is for OpenAI embeddings; adjust to 768 for Gemini
  match_threshold float,
  match_count int,
  p_repo_id uuid
)
returns table (
  id uuid,
  repo_id uuid,
  file_path text,
  content text,
  metadata jsonb,
  similarity float
)
language sql stable
as $$
  select
    code_chunks.id,
    code_chunks.repo_id,
    code_chunks.file_path,
    code_chunks.content,
    code_chunks.metadata,
    1 - (code_chunks.embedding <=> query_embedding) as similarity
  from code_chunks
  where code_chunks.repo_id = p_repo_id
    and 1 - (code_chunks.embedding <=> query_embedding) > match_threshold
  order by code_chunks.embedding <=> query_embedding
  limit match_count;
$$;
