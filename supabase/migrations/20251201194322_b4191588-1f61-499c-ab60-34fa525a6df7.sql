-- Política para permitir UPDATE de objetos no bucket car-fotos
CREATE POLICY "Allow authenticated users to update car-fotos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'car-fotos')
WITH CHECK (bucket_id = 'car-fotos');

-- Política para permitir DELETE de objetos no bucket car-fotos  
CREATE POLICY "Allow authenticated users to delete car-fotos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'car-fotos');