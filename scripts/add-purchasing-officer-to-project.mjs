import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';

// ═══════════════════════════════════════════════════════════════
// 1) BACKEND DTO
// ═══════════════════════════════════════════════════════════════
const dtoPath = ROOT + '/backend/src/modules/projects/dto/create-project.dto.ts';
let dto = fs.readFileSync(dtoPath, 'utf8');

if (!dto.includes('purchasingOfficerId')) {
  const anchor = '  consultantId?: string;';
  if (dto.includes(anchor)) {
    dto = dto.replace(
      anchor,
      anchor + '\n\n  @ApiPropertyOptional()\n  @IsOptional()\n  @IsUUID()\n  purchasingOfficerId?: string;'
    );
    fs.writeFileSync(dtoPath, dto, 'utf8');
    console.log('OK backend DTO');
  } else {
    console.log('!! DTO anchor not found');
  }
} else {
  console.log('SKIP DTO');
}

// ═══════════════════════════════════════════════════════════════
// 2) BACKEND SERVICE
// ═══════════════════════════════════════════════════════════════
const svcPath = ROOT + '/backend/src/modules/projects/projects.service.ts';
let svc = fs.readFileSync(svcPath, 'utf8');

// create: add purchasingOfficerId
if (!svc.includes('purchasingOfficerId')) {
  // Try common patterns for consultantId in create
  const patterns = [
    "consultantId: dto.consultantId,",
    "consultantId: dto.consultantId || null,",
  ];
  let patched = false;
  for (const p of patterns) {
    if (svc.includes(p)) {
      svc = svc.replace(p, p + '\n        purchasingOfficerId: dto.purchasingOfficerId || null,');
      patched = true;
      break;
    }
  }

  // update: common pattern
  if (svc.includes("if (dto.consultantId !== undefined)")) {
    svc = svc.replace(
      "if (dto.consultantId !== undefined)",
      "if (dto.purchasingOfficerId !== undefined) data.purchasingOfficerId = dto.purchasingOfficerId;\n      if (dto.consultantId !== undefined)"
    );
    patched = true;
  }

  // include: add purchasingOfficer in select/include
  const includePatterns = [
    "consultant: { select:",
    "consultant: true,",
  ];
  for (const p of includePatterns) {
    if (svc.includes(p)) {
      // Just warn user — include is optional for the form to work
      console.log('  (include partner consultant پیدا شد — دستی در آینده)');
      break;
    }
  }

  if (patched) {
    fs.writeFileSync(svcPath, svc, 'utf8');
    console.log('OK backend Service');
  } else {
    console.log('!! Service anchor not found — manual patch needed');
  }
} else {
  console.log('SKIP Service');
}

// ═══════════════════════════════════════════════════════════════
// 3) FRONTEND FormData interface
// ═══════════════════════════════════════════════════════════════
const formPath = ROOT + '/frontend/src/modules/projects/pages/ProjectFormPage.tsx';
let form = fs.readFileSync(formPath, 'utf8');

if (!form.includes('purchasingOfficerId?: string')) {
  // In interface FormData
  form = form.replace(
    'interface FormData {\n  name: string;\n  type: ProjectType;\n  status: ProjectStatus;\n  usage?: ProjectUsage;\n  clientId?: string;\n  consultantId?: string;',
    'interface FormData {\n  name: string;\n  type: ProjectType;\n  status: ProjectStatus;\n  usage?: ProjectUsage;\n  clientId?: string;\n  consultantId?: string;\n  purchasingOfficerId?: string;'
  );
  console.log('OK frontend FormData');
} else {
  console.log('SKIP FormData');
}

// ═══════════════════════════════════════════════════════════════
// 4) FRONTEND — state for officers
// ═══════════════════════════════════════════════════════════════
if (!form.includes('const [officers')) {
  form = form.replace(
    "const [clients, setClients] = useState<Partner[]>([]);",
    "const [clients, setClients] = useState<Partner[]>([]);\n  const [officers, setOfficers] = useState<any[]>([]);"
  );
  console.log('OK officers state');
}

// ═══════════════════════════════════════════════════════════════
// 5) FRONTEND — fetch officers (users)
// ═══════════════════════════════════════════════════════════════
if (!form.includes("'/users'")) {
  // Find a fetch call (likely partners) and add users fetch
  const fetchAnchor = "api.get('/partners'";
  if (form.includes(fetchAnchor)) {
    // try to add to Promise.all or similar
    form = form.replace(
      "api.get('/partners'",
      "api.get('/users').then((r) => r.data).catch(() => []),\n        api.get('/partners'"
    );
    console.log('OK fetch users added');
  } else {
    // fallback: add separate useEffect
    console.log('  (شکل fetch پیدا نشد — احتمالا دستی)');
  }
}

// ═══════════════════════════════════════════════════════════════
// 6) FRONTEND — handle Promise.all destructure
// ═══════════════════════════════════════════════════════════════
// If .then(([p]) => ...) found, patch to [u, p]
if (form.match(/\.then\(\(\[p\]\)/)) {
  form = form.replace(/\.then\(\(\[p\]\)/, '.then(([u, p])');
  // setClients(p) → setOfficers(u) too
  if (form.includes('setClients(p);')) {
    form = form.replace('setClients(p);', 'setOfficers(Array.isArray(u) ? u : []);\n      setClients(Array.isArray(p) ? p : []);');
  }
  console.log('OK Promise.all destructure');
}

// ═══════════════════════════════════════════════════════════════
// 7) FRONTEND — reset default when editing
// ═══════════════════════════════════════════════════════════════
if (!form.includes('purchasingOfficerId: editing') && form.includes('consultantId: editing')) {
  form = form.replace(
    /(consultantId: editing\.consultantId[^\n]*\n)/,
    '$1          purchasingOfficerId: (editing as any).purchasingOfficerId || undefined,\n'
  );
  console.log('OK reset edit');
}

if (!form.includes('purchasingOfficerId: undefined') && form.includes('consultantId: undefined')) {
  form = form.replace(
    /(consultantId: undefined,)/,
    '$1\n          purchasingOfficerId: undefined,'
  );
  console.log('OK reset default');
}

// ═══════════════════════════════════════════════════════════════
// 8) FRONTEND — dropdown JSX (after consultantId select)
// ═══════════════════════════════════════════════════════════════
if (!form.includes("register('purchasingOfficerId')")) {
  // Find consultantId select block and add after
  const consultBlockRe = /(<select \{\.\.\.register\('consultantId'\)\}[\s\S]*?<\/select>)/;
  const match = form.match(consultBlockRe);
  if (match) {
    // Find the closing </div> of the wrapping div after select
    const consultSelect = match[1];
    // Insert new field after the consultant field's closing </div>
    const insertAfterRe = new RegExp(
      consultSelect.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*</div>',
      'm'
    );
    const fullMatch = form.match(insertAfterRe);
    
    if (fullMatch) {
      const newField = fullMatch[0] + `

            <div>
              <label className="label">کارپرداز پروه</label>
              <select {...register('purchasingOfficerId')} className="input w-full">
                <option value="">— انتخاب کنید —</option>
                {officers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName}{u.username ? ' (' + u.username + ')' : ''}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">
                کارپرداز مسئول دریافت و مدیریت دستورات خرید این پروه است
              </p>
            </div>`;
      form = form.replace(fullMatch[0], newField);
      console.log('OK dropdown added');
    } else {
      console.log('!! consultant div closing not found');
    }
  } else {
    console.log('!! consultantId select not found');
  }
} else {
  console.log('SKIP dropdown');
}

fs.writeFileSync(formPath, form, 'utf8');

console.log('');
console.log('=== DONE ===');