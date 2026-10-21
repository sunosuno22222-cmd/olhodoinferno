# Validador de CPF + consulta legítima de nomes registrados

## O que muda
Uma terceira aba no painel, ao lado de "IP / Domínio" e "Celular": **Documento**.

### 1. Validador de CPF
- Você digita um CPF e o sistema confere os dígitos verificadores, dizendo se ele é válido ou não.
- Mostra a região fiscal de origem (ex.: 8ª região = SP), que sai do 9º dígito.
- Formata o número (000.000.000-00).
- Não busca nome nem outros dados da pessoa. Um aviso na tela explica isso.

### 2. Nome registrado de forma legítima: CNPJ (empresas)
- Dados de empresas são públicos por lei (Receita Federal). Digitando um CNPJ, o sistema mostra:
  razão social, nome fantasia, situação cadastral, data de abertura, atividade principal, endereço, telefone e e-mail comerciais e os sócios (como a Receita publica).
- O campo identifica sozinho se o número digitado é um CPF (11 dígitos) ou um CNPJ (14 dígitos).

### 3. Mais dados no celular
- Mostra o estado e as cidades principais de cada DDD brasileiro.

## O que continua fora
- Nome ou CPF de pessoas a partir do telefone ou do CPF: não existe fonte legal para isso.

## Detalhes técnicos
- `src/lib/document.ts`: validação de CPF/CNPJ (módulo 11) e tabela de regiões fiscais; testes em vitest para dígitos válidos e inválidos.
- `src/lib/cnpj-lookup.functions.ts`: createServerFn que consulta a BrasilAPI (`/api/cnpj/v1/{cnpj}`) e usa a publica.cnpj.ws como reserva.
- Tabela de DDDs estática usada por `lookupPhone`.
- `IpScannerPanel`: modo "doc" com histórico e JSON copiável, como já funciona nos outros modos.
