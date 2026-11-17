-- Fase 5: tema base Grafite Noturno.
-- Cor de texto escura (pensada para superficies brancas) ficaria ilegivel no tema escuro: volta ao padrao claro.
-- Fundo anterior (#3f73c8 padrao antigo) volta ao fundo grafite. Cor primaria e logo sao mantidos.
UPDATE company_settings SET text_color = '#f1f5f9';
UPDATE company_settings SET background_color = '#0b1220' WHERE background_color = '#3f73c8';
