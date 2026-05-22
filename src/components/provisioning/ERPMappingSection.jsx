// components/provisioning/ERPMappingSection.jsx
import { useState, useCallback, useRef } from 'react';
import { ChevronDown, ChevronUp, Wand2, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const ROLES_PRIMARIO = [
  { value: '',                label: 'Ignorar este campo'                    },
  { value: 'id',              label: 'ID único del registro'                 },
  { value: 'nombre',          label: 'Nombre o descripción'                  },
  { value: 'precio',          label: 'Precio o ingreso'                      },
  { value: 'stock',           label: 'Stock o cantidad'                      },
  { value: 'sku',             label: 'SKU o código interno'                  },
  { value: 'categoria',       label: 'Categoría o tipo de servicio'          },
  { value: 'tecnico',         label: 'Técnico, responsable o repartidor'     },
  { value: 'comuna',          label: 'Comuna, zona o ciudad'                 },
  { value: 'fecha',           label: 'Fecha principal (creación)'            },
  { value: 'costo',           label: 'Costo o gasto'                         },
  { value: 'numero',          label: 'Número de orden o folio'               },
  { value: 'estado',          label: 'Estado de la orden'                    },
  { value: 'prioridad',       label: 'Prioridad'                             },
  { value: 'direccion',       label: 'Dirección o ubicación'                 },
  { value: 'cliente_id',      label: 'ID del cliente relacionado'            },
  { value: 'cliente_nombre',  label: 'Nombre del cliente'                    },
  { value: 'productos',       label: 'Productos o materiales de la orden'    },
  { value: 'fecha_compromiso',label: 'Fecha compromiso o entrega'            },
  { value: 'fecha_cierre',    label: 'Fecha de cierre o finalización'        },
  { value: 'notas',           label: 'Notas u observaciones'                 },
];

const ROLES_SECUNDARIO = [
  { value: '',            label: 'Ignorar este campo'                                },
  { value: 'join_id',     label: 'ID de cruce (relaciona con endpoint principal)'    },
  { value: 'stock_real',  label: 'Valor de stock real'                               },
];

function extraerClaves(jsonStr) {
  try {
    const parsed = JSON.parse(jsonStr.trim());
    const obj    = Array.isArray(parsed) ? parsed[0] : parsed;
    if (!obj || typeof obj !== 'object') return null;
    return Object.keys(obj);
  } catch { return null; }
}

function construirMapping(filasPrimario, filasSecundario, urlSecundario, erpToken) {
  const mapping = {};
  const fp = Array.isArray(filasPrimario)   ? filasPrimario  : [];
  const fs = Array.isArray(filasSecundario) ? filasSecundario : [];
  for (const f of fp) {
    if (f.rol && f.campo) mapping[f.rol] = f.campo;
  }
  if (urlSecundario?.trim()) {
    mapping.stock_url = urlSecundario.trim();
    for (const f of fs) {
      if (f.rol === 'join_id'    && f.campo) mapping.stock_join_id  = f.campo;
      if (f.rol === 'stock_real' && f.campo) mapping.stock_real_key = f.campo;
    }
  }
  if (erpToken?.trim()) mapping.erp_token = erpToken.trim();
  return Object.keys(mapping).length > 0 ? mapping : null;
}

const FilaMapeo = ({ campo, rol, roles, onChange, onRemove, removable }) => (
  <div className="grid items-center gap-2" style={{ gridTemplateColumns: '1fr 16px 1fr 24px' }}>
    <div className="bg-slate-950 border border-slate-800 px-3 py-2 text-xs font-mono text-slate-300 rounded-sm overflow-hidden text-ellipsis whitespace-nowrap">
      {campo}
    </div>
    <span className="text-slate-600 text-center text-xs">→</span>
    <select
      value={rol}
      onChange={e => onChange(campo, e.target.value)}
      className="bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-white focus:border-blue-600 outline-none rounded-sm w-full"
    >
      {roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
    </select>
    {removable
      ? <button type="button" onClick={() => onRemove(campo)} className="text-slate-600 hover:text-red-500 transition-colors p-1" aria-label={`Eliminar ${campo}`}><X size={13} /></button>
      : <span />
    }
  </div>
);

const PanelEndpoint = ({ titulo, placeholder, roles, filas, onFilasChange, jsonRaw, setJsonRaw, jsonError, setJsonError }) => {
  // onFilasChange recibe siempre el array completo actualizado.
  // Nunca pasamos una función de actualización — el padre necesita el valor concreto
  // para poder llamar a notificar con los datos correctos en el mismo ciclo.

  const detectar = useCallback(() => {
    const claves = extraerClaves(jsonRaw);
    if (!claves) { setJsonError('JSON inválido. Pega un objeto o array de ejemplo.'); return; }
    setJsonError('');
    const mapa  = Object.fromEntries(filas.map(f => [f.campo, f.rol]));
    const nuevo = claves.map(c => ({ campo: c, rol: mapa[c] || '' }));
    onFilasChange(nuevo);
  }, [jsonRaw, filas, onFilasChange, setJsonError]);

  const onChange = useCallback((campo, rol) => {
    const nuevo = filas.map(f => f.campo === campo ? { ...f, rol } : f);
    onFilasChange(nuevo);
  }, [filas, onFilasChange]);

  const onRemove = useCallback((campo) => {
    const nuevo = filas.filter(f => f.campo !== campo);
    onFilasChange(nuevo);
  }, [filas, onFilasChange]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="text-xs text-slate-500 mb-1.5 block">{titulo}</label>
        <textarea
          value={jsonRaw}
          onChange={e => { setJsonRaw(e.target.value); setJsonError(''); }}
          placeholder={placeholder}
          className={`w-full h-20 font-mono text-xs px-3 py-2 bg-slate-950 border rounded-sm text-slate-300 resize-y outline-none focus:border-blue-600 placeholder:text-slate-700 ${jsonError ? 'border-red-500/50' : 'border-slate-800'}`}
        />
        {jsonError && <p className="text-xs text-red-400 mt-1">{jsonError}</p>}
        <button
          type="button"
          onClick={detectar}
          disabled={!jsonRaw.trim()}
          className="mt-2 flex items-center gap-1.5 text-xs bg-blue-600/10 text-blue-500 hover:bg-blue-600 hover:text-white border border-blue-600/50 px-3 py-1.5 rounded-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Wand2 size={12} aria-hidden /> Detectar campos
        </button>
      </div>

      {filas.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="grid items-center gap-2" style={{ gridTemplateColumns: '1fr 16px 1fr 24px' }}>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Campo en el JSON</p>
            <span />
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Rol semántico</p>
            <span />
          </div>
          {filas.map(f => (
            <FilaMapeo key={f.campo} campo={f.campo} rol={f.rol} roles={roles}
              onChange={onChange} onRemove={onRemove} removable={filas.length > 1} />
          ))}
        </div>
      )}
    </div>
  );
};

export const ERPMappingSection = ({ onChange }) => {
  const [open, setOpen] = useState(false);

  const [jsonPrimario,  setJsonPrimario]  = useState('');
  const [errorPrimario, setErrorPrimario] = useState('');
  const [filasPrimario, setFilasPrimario] = useState([]);

  const [mostrarSecundario, setMostrarSecundario] = useState(false);
  const [urlSecundario,     setUrlSecundario]     = useState('');
  const [jsonSecundario,    setJsonSecundario]    = useState('');
  const [errorSecundario,   setErrorSecundario]   = useState('');
  const [filasSecundario,   setFilasSecundario]   = useState([]);

  const [erpToken,          setErpToken]          = useState('');

  const erpTokenRef = useRef('');
  erpTokenRef.current = erpToken;

  // useRef para leer siempre el estado más reciente dentro de los callbacks
  // sin depender de closures que pueden quedar obsoletos entre renders.
  const filasPrimarioRef   = useRef(filasPrimario);
  const filasSecundarioRef = useRef(filasSecundario);
  const urlSecundarioRef   = useRef(urlSecundario);
  const onChangeRef        = useRef(onChange);

  // Sincronizar refs con el estado actual en cada render
  filasPrimarioRef.current   = filasPrimario;
  filasSecundarioRef.current = filasSecundario;
  urlSecundarioRef.current   = urlSecundario;
  onChangeRef.current        = onChange;

  const notificar = useCallback((fp, fs, url) => {
    const mapping = construirMapping(
      Array.isArray(fp)  ? fp  : [],
      Array.isArray(fs)  ? fs  : [],
      url || '',
      erpTokenRef.current
    );
    onChangeRef.current(mapping);
  }, []); // Sin dependencias — lee todo desde refs

  const onFilasPrimario = useCallback(f => {
    setFilasPrimario(f);
    notificar(f, filasSecundarioRef.current, urlSecundarioRef.current);
  }, [notificar]);

  const onFilasSecundario = useCallback(f => {
    setFilasSecundario(f);
    notificar(filasPrimarioRef.current, f, urlSecundarioRef.current);
  }, [notificar]);

  const onUrlSecundario = useCallback(u => {
    setUrlSecundario(u);
    notificar(filasPrimarioRef.current, filasSecundarioRef.current, u);
  }, [notificar]);

  const mappingActual      = construirMapping(filasPrimario, filasSecundario, urlSecundario, erpToken);
  const camposConfigurados = mappingActual ? Object.keys(mappingActual).length : 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-sm overflow-hidden">

      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-800/50 transition-colors"
      >
        <div>
          <h2 className="text-xs font-bold text-slate-300 uppercase tracking-widest">
            Mapeo de campos ERP
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {open
              ? 'Pega un registro de ejemplo y asigna el rol de cada campo'
              : camposConfigurados > 0
                ? `${camposConfigurados} campos configurados`
                : 'Opcional — detecta los campos automáticamente desde el JSON'
            }
          </p>
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 text-slate-500 flex-shrink-0" />
          : <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />
        }
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-slate-800 px-6 py-5 flex flex-col gap-6">

              <PanelEndpoint
                titulo="Pega un registro de ejemplo del endpoint principal"
                placeholder={'{ "id": 1, "articulo": "Neumático 29x2.10", "precio_tienda": 12990 }'}
                roles={ROLES_PRIMARIO}
                filas={filasPrimario}    onFilasChange={onFilasPrimario}
                jsonRaw={jsonPrimario}   setJsonRaw={setJsonPrimario}
                jsonError={errorPrimario} setJsonError={setErrorPrimario}
              />

              <div className="border-t border-slate-800 pt-5">
                {!mostrarSecundario ? (
                  <button
                    type="button"
                    onClick={() => setMostrarSecundario(true)}
                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    <Plus size={13} aria-hidden /> Agregar endpoint secundario
                  </button>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">Endpoint secundario</p>
                      <button
                        type="button"
                        onClick={() => { setMostrarSecundario(false); setFilasSecundario([]); onUrlSecundario(''); }}
                        className="text-slate-600 hover:text-red-500 transition-colors p-1"
                        aria-label="Eliminar endpoint secundario"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    <div>
                      <label className="text-xs text-slate-500 mb-1.5 block">URL del endpoint</label>
                      <input
                        type="url"
                        value={urlSecundario}
                        onChange={e => onUrlSecundario(e.target.value)}
                        placeholder="https://api.empresa.com/stock"
                        className="w-full bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-white focus:border-blue-600 outline-none placeholder:text-slate-700"
                      />
                    </div>

                    <PanelEndpoint
                      titulo="Pega un registro de ejemplo de este endpoint"
                      placeholder={'{ "id_articulo": 217, "cantidad_disponible": 5 }'}
                      roles={ROLES_SECUNDARIO}
                      filas={filasSecundario}    onFilasChange={onFilasSecundario}
                      jsonRaw={jsonSecundario}   setJsonRaw={setJsonSecundario}
                      jsonError={errorSecundario} setJsonError={setErrorSecundario}
                    />
                  </div>
                )}
              </div>

              {/* Token de autenticación — opcional */}
              <div className="border-t border-slate-800 pt-5">
                <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-1.5 block">
                  Token de autenticación del ERP
                  <span className="text-slate-600 font-normal normal-case ml-1">(opcional)</span>
                </label>
                <input
                  type="password"
                  value={erpToken}
                  onChange={e => {
                    setErpToken(e.target.value);
                    onChangeRef.current(construirMapping(filasPrimario, filasSecundario, urlSecundario, e.target.value));
                  }}
                  placeholder="Bearer eyJhbGci... o ApiKey abc123"
                  className="w-full bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white focus:border-blue-600 outline-none placeholder:text-slate-700 font-mono rounded-sm"
                />
                <p className="text-[10px] text-slate-600 mt-1">
                  Si el ERP requiere autenticación, ingresa el valor completo del header Authorization.
                </p>
              </div>

              {mappingActual && (
                <div className="bg-slate-950 border border-slate-800 rounded-sm p-3">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">Resultado del mapeo</p>
                  <pre className="font-mono text-xs text-slate-400 overflow-x-auto whitespace-pre-wrap break-all">
                    {JSON.stringify(mappingActual, null, 2)}
                  </pre>
                </div>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
