"""Extrai os dados reais da Ferramenta de Precificação (.xlsm) para src/data/*.json.
Execução única em desenvolvimento. O .xlsm não faz parte do repositório.
"""
import json, warnings, os, sys
import openpyxl

warnings.filterwarnings("ignore")
SRC = sys.argv[1] if len(sys.argv) > 1 else "/mnt/user-uploads/Ferramenta_de_Precificação_Atualizada_28.08.2026.xlsm"
OUT = "src/data"
os.makedirs(OUT, exist_ok=True)
wb = openpyxl.load_workbook(SRC, data_only=True)


def num(v):
    if isinstance(v, (int, float)):
        return round(float(v), 8)
    return None


def txt(v):
    return str(v).strip() if v is not None else None


def write(name, data):
    with open(f"{OUT}/{name}.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    print(name, len(data) if hasattr(data, "__len__") else "")


# ---------- Produtos ----------
ws = wb["Lista de Produtos"]
produtos = []
for r in ws.iter_rows(min_row=3, max_col=3, values_only=True):
    v = txt(r[2])
    if v and " - " in v:
        code, desc = v.split(" - ", 1)
        produtos.append({"codigo": code.strip(), "descricao": desc.strip(), "full": v})
# dedupe preserving order
seen = set()
produtos = [p for p in produtos if not (p["full"] in seen or seen.add(p["full"]))]

# ---------- Insumos ----------
ws = wb["Insumos"]
insumos = []
for r in ws.iter_rows(min_row=3, max_col=4, values_only=True):
    v, c = txt(r[2]), num(r[3])
    if v and " - " in v:
        code, desc = v.split(" - ", 1)
        insumos.append({"codigo": code.strip(), "descricao": desc.strip(), "full": v, "custoUnitario": c})

# ---------- BOM ----------
ws = wb["Custo MP por Produto"]
bom = []
mpTotais = {}
for r in ws.iter_rows(min_row=3, values_only=True):
    prod, item, tipo, qtd, un, cu, ct = r[2], r[3], r[4], r[5], r[6], r[7], r[8]
    if prod and item:
        bom.append({
            "produto": txt(prod), "item": txt(item), "tipo": txt(tipo),
            "quantidade": num(qtd), "unidade": txt(un),
            "custoUnitario": num(cu), "custoTotal": num(ct),
        })
    p2, tot = r[10], r[11]
    if p2 and isinstance(tot, (int, float)) and txt(p2) != "Total Geral":
        mpTotais[txt(p2)] = round(float(tot), 6)

# ---------- Centro de custos: setores ----------
ws = wb["Centro de Custos"]
head = {}
grupos = {}
# colunas D..O (4..15)
labels = {}
for col in range(4, 16):
    g1 = txt(ws.cell(3, col).value)
    g2 = txt(ws.cell(4, col).value)
    g3 = txt(ws.cell(5, col).value)
    labels[col] = [x for x in (g1, g2, g3) if x]
# propagate group headers left-to-right
last3 = None
setores = []
rowmap = {
    "maoDeObra": 6, "manutencao": 7, "mesTotal": 8, "eficienciaPerdida": 9,
    "acabamento": 10, "transporteInterno": 11, "horasDisponiveis": 12,
    "horaPonte": 13, "horaIdeal": 14, "horaReal": 15,
}
grupo_atual = None
for col in range(4, 16):
    l = labels[col]
    # nome do setor = último rótulo presente na coluna
    nome = l[-1] if l else None
    grupo = l[0] if len(l) > 1 else (l[0] if l else None)
    if col == 4:
        grupo_atual = None
    if not nome:
        continue
    s = {"nome": nome, "grupo": grupo if grupo != nome else None}
    for key, row in rowmap.items():
        val = ws.cell(row, col).value
        s[key] = num(val) if isinstance(val, (int, float)) else (txt(val) or None)
    setores.append(s)

# roteiro por produto
roteiro = []
for r in ws.iter_rows(min_row=19, values_only=True):
    prod = txt(r[2])
    if not prod or " - " not in prod:
        continue
    roteiro.append({
        "produto": prod, "setor": txt(r[3]),
        "horaSetor": num(r[4]) if isinstance(r[4], (int, float)) else txt(r[4]),
        "horaProduto": num(r[5]) if isinstance(r[5], (int, float)) else txt(r[5]),
        "central": num(r[6]) if isinstance(r[6], (int, float)) else txt(r[6]),
        "horaArmacao": num(r[7]) if isinstance(r[7], (int, float)) else txt(r[7]),
        "custoArmacao": num(r[8]) if isinstance(r[8], (int, float)) else txt(r[8]),
        "pintura": num(r[9]) if isinstance(r[9], (int, float)) else txt(r[9]),
        "custoProducao": num(r[10]) if isinstance(r[10], (int, float)) else txt(r[10]),
        "kgPorProduto": num(r[12]) if isinstance(r[12], (int, float)) else txt(r[12]),
    })

# ---------- Guia CDC ----------
ws = wb["Guia - CDC"]
cdc_head = []
for col in range(4, 16):
    l = [txt(ws.cell(r, col).value) for r in (5, 6, 7)]
    l = [x for x in l if x]
    cdc_head.append(l[-1] if l else f"col{col}")
cdc_mo = []
for row in range(8, 18):
    nome = txt(ws.cell(row, 3).value)
    if not nome:
        continue
    vals = {}
    for i, col in enumerate(range(4, 16)):
        v = ws.cell(row, col).value
        vals[cdc_head[i]] = num(v) if isinstance(v, (int, float)) else txt(v)
    cdc_mo.append({"funcao": nome, "valores": vals})
cdc_manut = []
for row in range(21, 60):
    nome = txt(ws.cell(row, 3).value)
    if not nome or nome.lower().startswith("total"):
        continue
    cdc_manut.append({
        "setor": nome,
        "total": num(ws.cell(row, 4).value),
        "percentual": num(ws.cell(row, 5).value),
        "manutencaoSetor": num(ws.cell(row, 6).value),
    })

# ---------- Logística ----------
ws = wb["Logística"]
log_fixos, log_var = [], []
for row in range(6, 12):
    n, v = txt(ws.cell(row, 3).value), num(ws.cell(row, 4).value)
    if n and v is not None:
        log_fixos.append({"item": n, "valor": v})
    n2, v2 = txt(ws.cell(row, 5).value), num(ws.cell(row, 6).value)
    if n2 and v2 is not None:
        log_var.append({"item": n2, "valor": v2})
logistica = {
    "fixos": log_fixos, "variaveis": log_var,
    "totalFixos": num(ws.cell(12, 4).value),
    "totalVariaveisPorKm": num(ws.cell(12, 6).value),
    "kmRodadosMes": num(ws.cell(14, 4).value),
    "custoTotalPorKm": num(ws.cell(15, 4).value),
}

# ---------- Salários ----------
ws = wb["Salários"]
salarios, obs = [], []
for row in range(4, 12):
    cat = txt(ws.cell(row, 3).value)
    if not cat:
        continue
    if cat.lower().startswith("obs") or cat.lower().startswith("categoria mod") or cat.lower().startswith("portanto"):
        obs.append(cat)
    else:
        salarios.append({
            "categoria": cat, "salarioTotal": num(ws.cell(row, 4).value),
            "colaboradores": num(ws.cell(row, 5).value), "salarioMedio": num(ws.cell(row, 6).value),
        })

# ---------- Impostos ----------
ws = wb["Impostos"]
cenarios = []
def read_tax(title_row, first, last):
    itens = []
    for row in range(first, last + 1):
        p = txt(ws.cell(row, 3).value)
        if not p:
            continue
        itens.append({
            "produto": p, "icms": num(ws.cell(row, 4).value), "pis": num(ws.cell(row, 5).value),
            "cofins": num(ws.cell(row, 6).value), "irpj": num(ws.cell(row, 7).value),
            "csll": num(ws.cell(row, 8).value), "total": num(ws.cell(row, 9).value),
        })
    return {"nome": txt(ws.cell(title_row, 3).value), "itens": itens}
cenarios.append(read_tax(3, 6, 9))
cenarios.append(read_tax(11, 14, 18))
simples = []
for row in range(23, 30):
    de, ate, aliq, ded = ws.cell(row, 8).value, ws.cell(row, 9).value, ws.cell(row, 10).value, ws.cell(row, 11).value
    if isinstance(aliq, (int, float)):
        simples.append({"de": num(de), "ate": num(ate), "aliquota": num(aliq), "deduzir": num(ded)})
tonial = {
    "nome": txt(ws.cell(20, 3).value),
    "faturamento12m": num(ws.cell(22, 6).value),
    "faturamentoMes": num(ws.cell(23, 6).value),
    "aliquota": num(ws.cell(24, 6).value),
    "valorDeduzir": num(ws.cell(25, 6).value),
    "tributoMes": num(ws.cell(27, 6).value),
    "faixas": simples,
}

# ---------- Despesas ----------
ws = wb["Despesas"]
meses = []
for col in range(5, 29, 2):
    m = txt(ws.cell(3, col).value)
    if m:
        meses.append({"nome": m, "col": col})
linhas = []
for row in range(4, 96):
    grupo = txt(ws.cell(row, 3).value)
    conta = txt(ws.cell(row, 4).value)
    nome = grupo or conta
    if not nome:
        continue
    vals = []
    for m in meses:
        v = ws.cell(row, m["col"]).value
        p = ws.cell(row, m["col"] + 1).value
        vals.append({"valor": num(v), "percentual": num(p)})
    linhas.append({"nome": nome, "tipo": "grupo" if grupo else "conta", "valores": vals})
rodape = []
for row in (98, 99, 100, 101, 103, 105):
    nome = txt(ws.cell(row, 4).value)
    if not nome:
        continue
    vals = [num(ws.cell(row, m["col"]).value) for m in meses]
    rodape.append({"nome": nome, "valores": vals})
despesas = {
    "meses": [m["nome"] for m in meses],
    "linhas": linhas,
    "rodape": rodape,
    "mediaDespesas": num(ws.cell(107, 5).value),
}

# ---------- Parâmetros de precificação ----------
ws = wb["Precificação"]
parametros = {
    "produtoExemplo": txt(ws.cell(7, 12).value),
    "despesasPercentual": num(wb["Despesas"].cell(107, 5).value),
    "margemPadrao": num(ws.cell(18, 13).value),
    "comissao": num(ws.cell(18, 20).value),
    "inadimplencia": num(ws.cell(18, 25).value),
    "pecasPorEntregaPadrao": num(ws.cell(13, 20).value),
    "kmPadrao": num(ws.cell(13, 25).value),
    "fatorFrete": 1.5,
    "cenarios": [txt(ws.cell(r, 4).value) for r in (42, 43, 44)],
}

write("produtos", produtos)
write("insumos", insumos)
write("bom", bom)
write("mp-totais", mpTotais)
write("centro-custos", {"setores": setores, "roteiro": roteiro})
write("guia-cdc", {"maoDeObra": cdc_mo, "manutencao": cdc_manut})
write("logistica", logistica)
write("salarios", {"categorias": salarios, "observacoes": obs})
write("impostos", {"cenarios": cenarios, "tonial": tonial})
write("despesas", despesas)
write("parametros", parametros)
