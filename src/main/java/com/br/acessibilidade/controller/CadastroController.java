package com.br.acessibilidade.controller;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class CadastroController {

    @GetMapping("/cadastro")
    public String home(Model model) {
        model.addAttribute("titulo", "Cadastro");
        return "cadastro"; // procura templates/cadastro.html
    }
}
