
package com.br.acessibilidade.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.UUID;

@Service
public class SupabaseStorageService {

    @Value("${supabase.url}")
    private String supabaseUrl;

    @Value("${supabase.secret-key}")
    private String secretKey;

    @Value("${supabase.bucket:fotos-locais}")
    private String bucket;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .build();

    public String enviarFoto(MultipartFile arquivo)
            throws IOException, InterruptedException {

        if (arquivo == null || arquivo.isEmpty()) {
            throw new IllegalArgumentException("Arquivo vazio.");
        }

        if (arquivo.getSize() > 5 * 1024 * 1024) {
            throw new IllegalArgumentException(
                    "Cada foto deve ter no máximo 5 MB."
            );
        }

        String tipo = arquivo.getContentType();
        String extensao;

        if ("image/jpeg".equalsIgnoreCase(tipo)) {
            extensao = "jpg";
        } else if ("image/png".equalsIgnoreCase(tipo)) {
            extensao = "png";
        } else if ("image/webp".equalsIgnoreCase(tipo)) {
            extensao = "webp";
        } else {
            throw new IllegalArgumentException(
                    "Formato não permitido. Use JPEG, PNG ou WebP."
            );
        }

        // Gera um nome único para a imagem
        String nomeArquivo = UUID.randomUUID() + "." + extensao;

        String caminho = "locais/" + nomeArquivo;

        String baseUrl = supabaseUrl.replaceAll("/+$", "");

        // Endpoint de upload do Supabase Storage
        String endpoint = baseUrl
                + "/storage/v1/object/"
                + bucket
                + "/"
                + caminho;

        HttpRequest requisicao = HttpRequest.newBuilder()
                .uri(URI.create(endpoint))
                .timeout(Duration.ofSeconds(60))
                .header("apikey", secretKey)
                .header("Authorization", "Bearer " + secretKey)
                .header("Content-Type", tipo)
                .header("x-upsert", "false")
                .POST(
                        HttpRequest.BodyPublishers.ofByteArray(
                                arquivo.getBytes()
                        )
                )
                .build();

        HttpResponse<String> resposta = httpClient.send(
                requisicao,
                HttpResponse.BodyHandlers.ofString()
        );

        if (resposta.statusCode() < 200 ||
                resposta.statusCode() >= 300) {

            throw new IOException(
                    "Erro no Supabase Storage. HTTP "
                            + resposta.statusCode()
                            + ": "
                            + resposta.body()
            );
        }

        // Retorna a URL pública da imagem
        return baseUrl
                + "/storage/v1/object/public/"
                + bucket
                + "/"
                + caminho;
    }
}
