import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';

// ═══════════════════════════════════════════════════════════════
// FRONTEND
// ═══════════════════════════════════════════════════════════════
const f = ROOT + '/frontend/src/modules/projects/pages/ProjectFormPage.tsx';
let c = fs.readFileSync(f, 'utf8');
let changes = 0;

// 1) interface FormData
const ifaceOld = "  clientId?: string;\n  consultantId?: string;";
const ifaceNew = "  clientId?: string;\n  consultantId?: string;\n  purchasingOfficerId?: string;";
if (c.includes(ifaceOld) && !c.includes('purchasingOfficerId?: string')) {
  c = c.replace(ifaceOld, ifaceNew);
  changes++; console.log('OK interface FormData');
} else {
  console.log('SKIP interface');
}

// 2) state officers
const stateOld = "const [consultants, setConsultants] = useState<Partner[]>([]);";
const stateNew = "const [consultants, setConsultants] = useState<Partner[]>([]);\n  const [officers, setOfficers] = useState<any[]>([]);";
if (c.includes(stateOld) && !c.includes('const [officers')) {
  c = c.replace(stateOld, stateNew);
  changes++; console.log('OK state officers');
} else {
  console.log('SKIP state');
}

// 3) loadPartners — افزودن fetch users
const loadOld = `  const loadPartners = () => {
    Promise.all([
      partnersApi.list({ type: 'CLIENT' }).catch(() => []),
      partnersApi.list({ type: 'CONSULTANT' }).catch(() => []),
    ]).then(([c, co]) => {
      setClients(c);
      setConsultants(co);
    });
  };`;

const loadNew = `  const loadPartners = () => {
    Promise.all([
      partnersApi.list({ type: 'CLIENT' }).catch(() => []),
      partnersApi.list({ type: 'CONSULTANT' }).catch(() => []),
      api.get('/users').then((r: any) => r.data).catch(() => []),
    ]).then(([c, co, u]) => {
      setClients(Array.isArray(c) ? c : []);
      setConsultants(Array.isArray(co) ? co : []);
      setOfficers(Array.isArray(u) ? u : []);
    });
  };`;

if (c.includes(loadOld) && !c.includes("api.get('/users')")) {
  c = c.replace(loadOld, loadNew);
  changes++; console.log('OK loadPartners');
} else {
  console.log('SKIP loadPartners');
}

// 4) reset when editing — افزودن purchasingOfficerId
const resetOld = "          consultantId: p.consultant?.id,";
const resetNew = "          consultantId: p.consultant?.id,\n          purchasingOfficerId: (p as any).purchasingOfficerId || undefined,";
if (c.includes(resetOld) && !c.includes('purchasingOfficerId: (p as any)')) {
  c = c.replace(resetOld, resetNew);
  changes++; console.log('OK reset edit');
} else {
  console.log('SKIP reset');
}

// 5) JSX — افزودن div کارپرداز بعد از consultant div
const jsxAnchor = `                <button
                  type="button"
                  onClick={() => setShowConsultantModal(true)}
                  className="btn-secondary shrink-0 px-3"
                  title="افزودن مشاور جدید"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>`;

const jsxNew = `                <button
                  type="button"
                  onClick={() => setShowConsultantModal(true)}
                  className="btn-secondary shrink-0 px-3"
                  title="افزودن مشاور جدید"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div>
              <label className="label">کارپرداز پروژه</label>
              <select {...register('purchasingOfficerId')} className="input w-full">
                <option value="">— انتخاب کنید —</option>
                {officers.map((u: any) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName}{u.username ? ' (' + u.username + ')' : ''}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">
                کارپرداز مسئول دریافت و مدیریت دستورات خرید این پروژه است
              </p>
            </div>
          </div>`;

if (c.includes(jsxAnchor) && !c.includes("register('purchasingOfficerId')")) {
  c = c.replace(jsxAnchor, jsxNew);
  changes++; console.log('OK JSX dropdown');
} else {
  console.log('SKIP JSX');
}

// import api if not there
if (!c.includes("import { api }") && !c.includes("from '@/services/api'")) {
  // find first import line, add after
  const lines = c.split('\n');
  const idx = lines.findIndex((l) => l.startsWith('import '));
  if (idx >= 0) {
    lines.splice(idx + 1, 0, "import { api } from '@/services/api';");
    c = lines.join('\n');
    changes++; console.log('OK import api');
  }
} else {
  console.log('SKIP import api');
}

fs.writeFileSync(f, c, 'utf8');

// ═══════════════════════════════════════════════════════════════
// BACKEND DTO
// ═══════════════════════════════════════════════════════════════
const dtoPath = ROOT + '/backend/src/modules/projects/dto/create-project.dto.ts';
let dto = fs.readFileSync(dtoPath, 'utf8');

if (!dto.includes('purchasingOfficerId')) {
  const dtoAnchor = "  consultantId?: string;";
  if (dto.includes(dtoAnchor)) {
    dto = dto.replace(dtoAnchor, dtoAnchor + '\n\n  @ApiPropertyOptional()\n  @IsOptional()\n  @IsUUID()\n  purchasingOfficerId?: string;');
    fs.writeFileSync(dtoPath, dto, 'utf8');
    changes++; console.log('OK DTO');
  } else {
    console.log('!! DTO anchor not found');
  }
} else {
  console.log('SKIP DTO');
}

console.log('');
console.log('=== DONE — ' + changes + ' تغییر ===');