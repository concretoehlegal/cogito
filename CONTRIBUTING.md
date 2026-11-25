# Como participar

Obrigado por querer ajudar o COGITO! Este é um projeto pessoal, mas toda opinião, relato de bug e ideia faz diferença.

## 🐞 Encontrou um bug?

1. Veja se ele já não está na lista de [issues](../../issues).
2. Abra um **[relato de bug](../../issues/new?template=bug.yml)** dizendo:
   - em que área aconteceu (Escritor, Planejador de Campanhas ou Bestiário);
   - a versão do COGITO;
   - os passos para repetir o problema;
   - uma captura de tela, se puder.

> Não anexe livros, campanhas ou imagens com informações pessoais. Se precisar mostrar um arquivo, faça uma cópia de
> exemplo só com o necessário.

## 💡 Tem uma ideia?

- Para algo concreto, abra uma **[sugestão](../../issues/new?template=ideia.yml)**.
- Para conversar, trocar experiências ou mostrar o que você criou, use as **[Discussões](../../discussions)**.

## 🔔 Acompanhar as novidades

No alto da página do repositório, clique em **Watch › Custom › Releases** para receber um aviso a cada nova versão.
O que mudou em cada uma está no [CHANGELOG](CHANGELOG.md).

## 🛠️ Código

O código está aberto para consulta, mas **todos os direitos são reservados** (veja a [LICENSE](LICENSE)). Antes de
enviar um pull request, abra uma issue para combinarmos a mudança.

Para rodar o projeto:

```bash
npm install
npm run dev     # app em modo de desenvolvimento
npm run lint       # linter (oxlint, sem avisos)
npm test           # testes de unidade
npm run build      # verificação de tipos e build
npm run test:e2e   # testes de interface (depois do build; no Linux, com xvfb-run -a)
```

As instruções permanentes de desenvolvimento e a documentação técnica estão em `CLAUDE.md` e na pasta `docs/`.

## Como as versões são publicadas

1. A versão em `package.json` e a seção nova do `CHANGELOG.md` são atualizadas e enviadas ao `main`.
2. O GitHub Actions percebe a versão nova, compila o instalador e o `.zip` no Windows, cria a tag `vX.Y.Z` e publica
   a Release com as notas do CHANGELOG. (Enviar uma tag `vX.Y.Z` também funciona.)
