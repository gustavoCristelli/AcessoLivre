package com.br.acessibilidade.controller;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class ContribuirController {

    @GetMapping("/contribuir")
    public String home(Model model) {
        model.addAttribute("titulo", "Contribuir");
        return "contribuir"; // procura templates/contribuir.html
    }
}
