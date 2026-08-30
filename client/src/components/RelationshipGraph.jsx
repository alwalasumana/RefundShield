import React, { useMemo, useState } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  Handle,
  Position,
  useNodesState,
  useEdgesState
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { User, Smartphone, MapPin, ShoppingBag, RotateCcw, ShieldAlert, MousePointerClick } from 'lucide-react';
import NodeDetailModal from './NodeDetailModal';

// Custom Customer Node
const CustomerNode = ({ data }) => (
  <div className={`px-4 py-3 shadow-xl rounded-xl border bg-slate-900 min-w-[180px] cursor-pointer hover:border-blue-400 transition ${
    data.isPrimary ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-800'
  }`}>
    <Handle type="target" position={Position.Top} className="w-2.5 h-2.5 bg-blue-500" />
    <div className="flex items-center gap-2 mb-1">
      <div className={`p-1.5 rounded-lg ${data.riskScore > 60 ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
        <User className="w-4 h-4" />
      </div>
      <div>
        <div className="text-xs font-bold text-slate-200">{data.label}</div>
        <div className="text-[10px] font-mono text-slate-400">{data.customerId}</div>
      </div>
    </div>
    <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-800 text-[10px]">
      <span className="text-slate-400">Risk Score:</span>
      <span className={`font-mono font-bold ${data.riskScore > 60 ? 'text-red-400' : 'text-blue-400'}`}>
        {data.riskScore}
      </span>
    </div>
    <Handle type="source" position={Position.Bottom} className="w-2.5 h-2.5 bg-blue-500" />
  </div>
);

// Custom Device Node
const DeviceNode = ({ data }) => (
  <div className="px-3 py-2.5 shadow-lg rounded-xl border border-blue-500/30 bg-slate-900 text-blue-300 min-w-[160px] cursor-pointer hover:border-blue-400 transition">
    <Handle type="target" position={Position.Top} className="w-2 h-2 bg-blue-500" />
    <div className="flex items-center gap-2">
      <Smartphone className="w-4 h-4 text-blue-400" />
      <div>
        <div className="text-xs font-semibold">{data.label}</div>
        <div className="text-[9px] font-mono text-slate-400">{data.fingerprint}</div>
      </div>
    </div>
    {data.userCount > 1 && (
      <div className="mt-1.5 px-2 py-0.5 rounded bg-red-500/20 text-red-300 text-[9px] font-bold flex items-center gap-1">
        <ShieldAlert className="w-3 h-3" /> Shared across {data.userCount} users
      </div>
    )}
    <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-blue-500" />
  </div>
);

// Custom Address Node
const AddressNode = ({ data }) => (
  <div className="px-3 py-2.5 shadow-lg rounded-xl border border-amber-500/30 bg-slate-900 text-amber-300 min-w-[160px] cursor-pointer hover:border-amber-400 transition">
    <Handle type="target" position={Position.Top} className="w-2 h-2 bg-amber-500" />
    <div className="flex items-center gap-2">
      <MapPin className="w-4 h-4 text-amber-400" />
      <div>
        <div className="text-xs font-semibold">{data.label}</div>
        <div className="text-[9px] text-slate-400">{data.city} ({data.zip})</div>
      </div>
    </div>
    {data.userCount > 1 && (
      <div className="mt-1.5 px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold">
        {data.userCount} Accounts at location
      </div>
    )}
    <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-amber-500" />
  </div>
);

// Custom Order Node
const OrderNode = ({ data }) => (
  <div className="px-3 py-2 shadow-md rounded-lg border border-slate-700 bg-slate-900 text-slate-300 text-xs cursor-pointer hover:border-slate-500 transition">
    <Handle type="target" position={Position.Top} className="w-2 h-2 bg-slate-500" />
    <div className="flex items-center gap-1.5 font-mono">
      <ShoppingBag className="w-3.5 h-3.5 text-slate-400" />
      <span>{data.label}</span>
      <span className="text-blue-400">₹{data.amount}</span>
    </div>
    <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-slate-500" />
  </div>
);

// Custom Refund Node
const RefundNode = ({ data }) => (
  <div className="px-3 py-2 shadow-md rounded-lg border border-red-500/40 bg-red-950/40 text-red-300 text-xs font-mono font-bold cursor-pointer hover:border-red-400 transition">
    <Handle type="target" position={Position.Top} className="w-2 h-2 bg-red-500" />
    <div className="flex items-center gap-1.5">
      <RotateCcw className="w-3.5 h-3.5 text-red-400" />
      <span>{data.label}</span>
    </div>
    <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-red-500" />
  </div>
);

export default function RelationshipGraph({ initialNodes = [], initialEdges = [] }) {
  const [selectedNodeData, setSelectedNodeData] = useState(null);

  const nodeTypes = useMemo(() => ({
    customerNode: CustomerNode,
    deviceNode: DeviceNode,
    addressNode: AddressNode,
    orderNode: OrderNode,
    refundNode: RefundNode
  }), []);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  React.useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges]);

  const handleNodeClick = (event, node) => {
    if (node && node.data) {
      setSelectedNodeData(node.data);
    }
  };

  return (
    <div className="w-full h-[500px] bg-slate-950 rounded-xl border border-slate-800 overflow-hidden relative">
      {/* Dark theme CSS overrides for React Flow controls */}
      <style>{`
        .react-flow__controls {
          background-color: #0f172a !important; /* slate-900 */
          border: 1px solid #1e293b !important; /* slate-800 */
          border-radius: 8px !important;
          overflow: hidden !important;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3) !important;
        }
        .react-flow__controls-button {
          background-color: #0f172a !important;
          border-bottom: 1px solid #1e293b !important;
          color: #94a3b8 !important;
          fill: #94a3b8 !important;
          border-right: none !important;
          border-left: none !important;
        }
        .react-flow__controls-button:hover {
          background-color: #1e293b !important;
          color: #f8fafc !important;
          fill: #f8fafc !important;
        }
        .react-flow__controls-button svg {
          fill: currentColor !important;
        }
      `}</style>

      <div className="absolute top-3 left-3 z-10 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-lg text-[11px] text-slate-400 flex items-center gap-1.5 font-mono pointer-events-none">
        <MousePointerClick className="w-3.5 h-3.5 text-blue-400" />
        Click any node to inspect database document details
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        fitView
      >
        <Background color="#1e293b" gap={16} />
        <Controls className="bg-slate-900 border-slate-800 text-slate-200" />
      </ReactFlow>

      {/* Node Inspection Modal */}
      {selectedNodeData && (
        <NodeDetailModal nodeData={selectedNodeData} onClose={() => setSelectedNodeData(null)} />
      )}
    </div>
  );
}
