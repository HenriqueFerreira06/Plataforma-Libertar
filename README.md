# 🎓 Sistema de Gestão Escolar - Cursinho Pré-Vestibular

Bem-vindos ao repositório oficial do novo sistema de gestão do cursinho. 

Este projeto nasce da necessidade de substituir um sistema legado (focado em carteirinhas e saldo) por uma solução **autoral, leve e sob medida** para as reais necessidades da nossa instituição. O objetivo é termos um sistema limpo, direto ao ponto e desenvolvido com as melhores práticas de *Clean Code*.

## 🎯 Objetivo e Prazo (MVP)
Temos um prazo claro: **20 de março de 2026**, data de início das aulas.
Até lá, focaremos estritamente no Produto Mínimo Viável (MVP), priorizando funcionalidades essenciais para a operação da secretaria, direção e, posteriormente, dos alunos.

## 👥 Perfis de Acesso
O sistema contará com uma tela de login única e limpa. A partir da autenticação (E-mail e Senha), o sistema fará o roteamento inteligente:
* **Administração/Secretaria:** Acesso ao painel de gestão completo.
* **Alunos:** Acesso ao portal do aluno (a ser expandido após o MVP).

## 🚀 Funcionalidades do MVP (Escopo Fechado)
O desenvolvimento inicial deve cobrir exclusivamente os seguintes módulos:

1. **Dashboard Inicial:**
   - Contagem de total de registros/alunos ativos.
   - Alertas visuais de matrículas em processo de validação (pendência de documentos).

2. **Banco de Dados / Registros (Alunos):**
   - Cadastro manual de novos alunos (Informações, CPF, RG, Fotos, etc).
   - Consulta e edição de registros existentes.
   - *Feature futura (Pós-MVP): Importação em massa para transferência entre polos.*

3. **Controle de Frequência (Nova Funcionalidade Core):**
   - Sistema de chamadas para controle de presenças e faltas.
   - Relacionamento claro entre: `Aluno` <-> `Turma` <-> `Data da Aula`.

4. **Relatórios:**
   - Foco na listagem e agrupamento de registros realizados dentro de um intervalo de tempo customizável.

5. **Administração:**
   - Cadastro, edição e controle de acesso de novos colaboradores e membros da equipe.

## 🛠 Stack Tecnológica

Para garantirmos a entrega ágil e mantermos o orçamento da fase de testes otimizado, a stack escolhida foi:

* **Frontend:**
  - HTML5, CSS3 e JavaScript (Vanilla JS).
  - **Framework CSS:** Bootstrap (ou Tailwind) para acelerar a criação de interfaces padronizadas e responsivas.
  - *Nota: Não utilizaremos frameworks SPA (React/Vue/Angular) nesta etapa.*

* **Backend e Banco de Dados (Em definição pela equipe):**
  - O projeto está sendo estruturado para receber integração via **Firebase** (solução ágil NoSQL) OU via **PHP com PDO / Arquitetura MVC** (solução robusta relacional com MySQL).

## 📁 Estrutura de Pastas Padrão
Para mantermos o código limpo e organizado, siga a estrutura abaixo para os arquivos estáticos:

```text
/
├── /assets
│   ├── /css          # Estilos globais e específicos (ex: style.css, login.css)
│   ├── /js           # Lógica de interface (ex: main.js, auth.js)
│   └── /img          # Logotipos, ícones e assets visuais
│
├── index.html        # Tela de Login Principal
├── dashboard.html    # Painel inicial (Resumo e Alertas)
├── alunos.html       # Lista e cadastro de alunos
├── frequencia.html   # Módulo de chamadas
└── administracao.html# Gestão de equipe
