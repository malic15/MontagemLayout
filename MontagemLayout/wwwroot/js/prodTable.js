const table = document.querySelector('.prod-table');
const theadEl = table.querySelector('thead');
const tbodyEl = table.querySelector('tbody');

const badgeClasses = ['badge-purple', 'badge-blue', 'badge-cyan', 'badge-teal', 'badge-indigo'];

const formatDay = d =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export async function renderProdTable(qs) {
    theadEl.replaceChildren();
    tbodyEl.replaceChildren();
    const res = await fetch(`/data/prod-hour-day?${qs.toString()}`);
    const matrix = await res.json();

    const headHtml =
        `<tr>
      <th class="row-label">Linha</th>
      ${matrix.hours.map(h => `<th><span class="pill">${h}</span></th>`).join('')}
      <th class="total">Total</th>
    </tr>`;

    const bodyHtml = matrix.rows.map((row, i) => {
        const cls = badgeClasses[i % badgeClasses.length];
        const cells = row.values.map(v =>
            v ? `<td>${v}</td>` : `<td class="cell-na">N/A</td>`
        ).join('');
        const total = (row.total ?? row.values.reduce((a, b) => a + (b || 0), 0));
        return `
      <tr>
        <td class="row-label"><span class="line-badge">${row.line}</span></td>
        ${cells}
        <td class="total"><span class="total-pill">${total}</span></td>
      </tr>`;
    }).join('');

    theadEl.innerHTML = headHtml;
    tbodyEl.innerHTML = bodyHtml;
}

const btn = document.getElementById('loadProd');


btn.addEventListener('click', async () => {
    if (btn.dataset.loading === '1') return;

    const input = document.getElementById('dayProd').value;
    const day = input || formatDay(new Date());

    const qs = new URLSearchParams({ day });
    const originalHTML = btn.innerHTML;
    btn.dataset.loading = '1';
    btn.disabled = true;
    btn.innerHTML = `<i class='bx bx-loader-alt bx-spin'></i><span> Carregando</span>`;

    try {
        await renderProdTable(qs);          // <-- sua função deve aceitar 'day'
    } catch (err) {
        console.error('Falha ao carregar:', err);
        // opcional: exibir um toast/alert
    } finally {
        btn.disabled = false;
        btn.dataset.loading = '0';
        btn.innerHTML = originalHTML;        // volta ao texto/ícone original
    }

});