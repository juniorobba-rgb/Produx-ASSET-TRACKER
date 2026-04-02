import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, setDoc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { formatCurrency, normalizeAssetName } from '../lib/utils';
import { Search, Plus, Filter, Download, Trash2, ShieldAlert } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export function Assets() {
  const { profile } = useAuth();
  const [assets, setAssets] = useState<any[]>([]);
  const [assetTypes, setAssetTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewMode, setViewMode] = useState<'all' | 'mine'>('all');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAssetName, setNewAssetName] = useState('');
  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [error, setError] = useState('');

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<{id: string, name: string} | null>(null);

  useEffect(() => {
    const qAssets = query(collection(db, 'assets'));
    const unsubAssets = onSnapshot(qAssets, (snapshot) => {
      setAssets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'assets'));

    const qTypes = query(collection(db, 'assetTypes'));
    const unsubTypes = onSnapshot(qTypes, (snapshot) => {
      setAssetTypes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'assetTypes'));

    return () => {
      unsubAssets();
      unsubTypes();
    };
  }, []);

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!newAssetName.trim() || !selectedTypeId) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    const normalizedId = normalizeAssetName(newAssetName);
    const assetRef = doc(db, 'assets', normalizedId);
    
    try {
      const docSnap = await getDoc(assetRef);
      if (docSnap.exists()) {
        setError('Erreur: Un asset avec ce nom existe déjà.');
        return;
      }

      const selectedType = assetTypes.find(t => t.id === selectedTypeId);
      if (!selectedType) return;

      await setDoc(assetRef, {
        name: newAssetName.trim(),
        typeId: selectedType.id,
        typeName: selectedType.name,
        price: selectedType.defaultPrice,
        status: 'En cours',
        assignedUserId: profile?.uid || null,
        assignedUserName: profile?.displayName || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      setIsModalOpen(false);
      setNewAssetName('');
      setSelectedTypeId('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `assets/${normalizedId}`);
    }
  };

  const updateStatus = async (assetId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'assets', assetId), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `assets/${assetId}`);
    }
  };

  const confirmDelete = (id: string, name: string) => {
    setAssetToDelete({ id, name });
    setIsDeleteModalOpen(true);
  };

  const executeDelete = async () => {
    if (!assetToDelete) return;
    try {
      await deleteDoc(doc(db, 'assets', assetToDelete.id));
      setIsDeleteModalOpen(false);
      setAssetToDelete(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `assets/${assetToDelete.id}`);
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text('Rapport des Assets', 14, 15);
    
    const tableData = filteredAssets.map(a => [
      a.name,
      a.typeName,
      a.assignedUserName || 'Non assigné',
      a.status,
      formatCurrency(a.price)
    ]);

    autoTable(doc, {
      head: [['Nom', 'Type', 'Assigné à', 'Statut', 'Tarif']],
      body: tableData,
      startY: 20,
    });

    doc.save('assets-export.pdf');
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredAssets.map(a => ({
      Nom: a.name,
      Type: a.typeName,
      'Assigné à': a.assignedUserName || 'Non assigné',
      Statut: a.status,
      Tarif: a.price,
      'Date Création': new Date(a.createdAt).toLocaleDateString()
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Assets");
    XLSX.writeFile(wb, "assets-export.xlsx");
  };

  const filteredAssets = assets.filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter ? a.status === statusFilter : true;
    const matchesViewMode = viewMode === 'all' || a.assignedUserId === profile?.uid;
    return matchesSearch && matchesStatus && matchesViewMode;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Validé': return <Badge variant="success">Validé</Badge>;
      case 'En cours': return <Badge variant="info">En cours</Badge>;
      case 'Correction': return <Badge variant="warning">Correction</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  if (loading) return <div>Loading assets...</div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto relative">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-white tracking-tight">Assets</h1>
        <div className="flex items-center gap-3">
          {profile?.role === 'admin' && (
            <div className="flex gap-2 mr-4">
              <Button variant="secondary" size="sm" onClick={exportPDF}>
                <Download className="w-4 h-4 mr-2" /> PDF
              </Button>
              <Button variant="secondary" size="sm" onClick={exportExcel}>
                <Download className="w-4 h-4 mr-2" /> Excel
              </Button>
            </div>
          )}
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="w-5 h-5 mr-2" /> Nouvel Asset
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 border-b border-white/10">
        <button
          onClick={() => setViewMode('all')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${viewMode === 'all' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-white/20'}`}
        >
          Tous les assets
        </button>
        <button
          onClick={() => setViewMode('mine')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${viewMode === 'mine' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-white/20'}`}
        >
          Mes assets
        </button>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white/5">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Rechercher un asset..." 
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400" />
            <Select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-40"
            >
              <option value="">Tous les statuts</option>
              <option value="En cours">En cours</option>
              <option value="Correction">Correction</option>
              <option value="Validé">Validé</option>
            </Select>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="text-xs uppercase bg-white/5 text-slate-400 border-b border-white/10">
              <tr>
                <th className="px-6 py-4 font-medium">Nom</th>
                <th className="px-6 py-4 font-medium">Type</th>
                <th className="px-6 py-4 font-medium">Assigné à</th>
                <th className="px-6 py-4 font-medium">Tarif</th>
                <th className="px-6 py-4 font-medium">Statut</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    Aucun asset trouvé
                  </td>
                </tr>
              ) : (
                filteredAssets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-medium text-white">{asset.name}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-white/10 text-xs font-medium text-slate-300">
                        {asset.typeName}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-[10px] font-medium text-white">
                          {asset.assignedUserName?.charAt(0).toUpperCase() || '?'}
                        </div>
                        {asset.assignedUserName || 'Non assigné'}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-400">{formatCurrency(asset.price)}</td>
                    <td className="px-6 py-4">{getStatusBadge(asset.status)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Select 
                          value={asset.status}
                          onChange={(e) => updateStatus(asset.id, e.target.value)}
                          className="w-32 inline-block h-8 py-1 text-xs"
                        >
                          <option value="En cours">En cours</option>
                          <option value="Correction">Correction</option>
                          <option value="Validé">Validé</option>
                        </Select>
                        {profile?.role === 'admin' && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => confirmDelete(asset.id, asset.name)} 
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2 h-8"
                            title="Supprimer l'asset"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Creation */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            <CardHeader>
              <CardTitle>Créer un nouvel asset</CardTitle>
            </CardHeader>
            <CardContent>
              {assetTypes.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-amber-400 mb-4">Aucun type d'asset n'est disponible.</p>
                  <p className="text-slate-300 text-sm mb-6">Un administrateur doit d'abord créer des types d'assets dans les paramètres avant de pouvoir créer un asset.</p>
                  <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
                    Fermer
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleCreateAsset} className="space-y-4">
                  {error && (
                    <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm">
                      {error}
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Nom de l'asset (Unique)</label>
                    <Input 
                      placeholder="Ex: Hero Banner v2" 
                      value={newAssetName}
                      onChange={(e) => setNewAssetName(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Type d'asset</label>
                    <Select 
                      value={selectedTypeId}
                      onChange={(e) => setSelectedTypeId(e.target.value)}
                    >
                      <option value="" disabled>Sélectionner un type</option>
                      {assetTypes.map(t => (
                        <option key={t.id} value={t.id}>{t.name} - {formatCurrency(t.defaultPrice)}</option>
                      ))}
                    </Select>
                  </div>
                  <div className="pt-4 flex justify-end gap-3">
                    <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
                      Annuler
                    </Button>
                    <Button type="submit">
                      Créer l'asset
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal Delete Confirmation */}
      {isDeleteModalOpen && assetToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            <CardHeader>
              <CardTitle className="text-red-400 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5" />
                Confirmer la suppression
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-300 mb-6">
                Êtes-vous sûr de vouloir supprimer l'asset <strong className="text-white">"{assetToDelete.name}"</strong> ? Cette action est irréversible.
              </p>
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>
                  Annuler
                </Button>
                <Button variant="danger" onClick={executeDelete}>
                  Supprimer
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
