
package com.br.acessibilidade.controller;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import com.br.acessibilidade.entity.Local;
import com.br.acessibilidade.repository.LocalRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.multipart.MultipartFile;
import com.br.acessibilidade.service.SupabaseStorageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;


import java.util.List;
import java.util.Map;


@RestController
@RequestMapping("/api/locais")
@CrossOrigin(origins = "*")
public class LocalController {

    @Autowired
    private SupabaseStorageService storageService;

    @Autowired
    private LocalRepository localRepository;

    @GetMapping
    public List<Local> listarLocais() {
        return localRepository.findAll();
    }

    @PostMapping
    public Local cadastrarLocal(@RequestBody Local local) {
        return localRepository.save(local);
    }


    @PutMapping("/{id}")
    public Local atualizarLocal(
            @PathVariable Long id,
            @RequestBody Local local) {

        Local existente = localRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Local não encontrado"
            ));

        existente.setNome(local.getNome());
        existente.setLat(local.getLat());
        existente.setLng(local.getLng());
        existente.setRampa(local.getRampa());
        existente.setBanheiro(local.getBanheiro());
        existente.setPisoTatil(local.getPisoTatil());
        existente.setFoto(local.getFoto());
        existente.setDescricao(local.getDescricao());

        return localRepository.save(existente);
    }

    @DeleteMapping("/{id}")
    public void excluirLocal(@PathVariable Long id) {

        if (!localRepository.existsById(id)) {
            throw new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Local não encontrado"
            );
        }

        localRepository.deleteById(id);
    }

    
@PostMapping(
    value = "/upload",
    consumes = MediaType.MULTIPART_FORM_DATA_VALUE
)
public ResponseEntity<?> receberFotos(
        @RequestParam("fotos") List<MultipartFile> fotos) {

    if (fotos == null || fotos.isEmpty()) {
        return ResponseEntity.badRequest().body(
                Map.of("erro", "Nenhuma foto foi enviada.")
        );
    }

    // Valida todos os arquivos antes de começar o upload
    long tamanhoTotal = 0;

    for (MultipartFile foto : fotos) {

        if (foto == null || foto.isEmpty()) {
            return ResponseEntity.badRequest().body(
                    Map.of("erro", "Existe um arquivo vazio.")
            );
        }

        tamanhoTotal += foto.getSize();

        if (tamanhoTotal > 25 * 1024 * 1024) {
            return ResponseEntity.badRequest().body(
                    Map.of("erro", "O total das fotos não pode ultrapassar 25 MB.")
            );
        }

        String tipo = foto.getContentType();

        if (tipo == null ||
                !(tipo.equalsIgnoreCase("image/jpeg")
                || tipo.equalsIgnoreCase("image/png")
                || tipo.equalsIgnoreCase("image/webp"))) {

            return ResponseEntity.badRequest().body(
                    Map.of("erro", "Formato de imagem não permitido.")
            );
        }

        if (foto.getSize() > 5 * 1024 * 1024) {
            return ResponseEntity.badRequest().body(
                    Map.of("erro", "Cada foto deve ter no máximo 5 MB.")
            );
        }
    }

    try {

        List<String> urls = new ArrayList<>();

        // Envia todas as imagens para o Supabase
        for (MultipartFile foto : fotos) {
            String url = storageService.enviarFoto(foto);
            urls.add(url);
        }

        return ResponseEntity.ok(
                Map.of(
                        "mensagem", "Fotos armazenadas com sucesso!",
                        "quantidade", urls.size(),
                        "fotos", urls
                )
        );

    } catch (InterruptedException e) {

        Thread.currentThread().interrupt();

        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(Map.of("erro", "Envio interrompido."));

    } catch (IllegalArgumentException e) {

        return ResponseEntity.badRequest()
                .body(Map.of("erro", e.getMessage()));

    } catch (Exception e) {

        e.printStackTrace();

        return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                .body(Map.of("erro", "Não foi possível armazenar as fotos."));
    }
}





}
