-- Rodar JUNTO com o deploy do front que exibe as fotos por link assinado
-- (ImagemSegura em src/components/ImageEditor.jsx). Antes disso, o site
-- antigo usa getPublicUrl e as fotos deixariam de carregar.
update storage.buckets set public = false where id = 'diario-imagens';
