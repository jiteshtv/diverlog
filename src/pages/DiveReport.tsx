import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Plus, Loader2, ArrowLeft, Printer, Pencil, Trash2, X, Share2, Download } from 'lucide-react';
import { format, set } from 'date-fns';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface DiveEvent {
    id: string;
    event_time: string;
    event_type: string;
    description: string;
    depth: number;
}

export default function DiveReport() {
    const { diveId } = useParams();
    const navigate = useNavigate();
    const [dive, setDive] = useState<any>(null);
    const [events, setEvents] = useState<DiveEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const contentRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);

    // Edit Mode State
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingEvent, setEditingEvent] = useState<DiveEvent | null>(null);

    // Form State for Modal
    const [formData, setFormData] = useState({
        time: '',
        depth: 0,
        event_type: '',
        description: ''
    });

    useEffect(() => {
        if (diveId) fetchDiveDetails();
    }, [diveId]);

    // Handle Mobile Scaling
    useEffect(() => {
        const handleResize = () => {
            // A4 width is 210mm approx 794px at 96 DPI
            const A4_WIDTH_PX = 794;
            const viewportWidth = window.innerWidth;

            if (viewportWidth < A4_WIDTH_PX + 40) { // 40px padding
                // Scale down to fit
                const newScale = (viewportWidth - 32) / A4_WIDTH_PX;
                setScale(newScale);
            } else {
                setScale(1);
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize(); // Init
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    async function fetchDiveDetails() {
        setLoading(true);
        try {
            const { data: diveData, error: diveError } = await supabase
                .from('dives')
                .select(`*, job:jobs(*), diver:divers(*), supervisor:profiles(full_name)`)
                .eq('id', diveId)
                .single();

            if (diveError) throw diveError;

            const { data: eventsData, error: eventsError } = await supabase
                .from('dive_events')
                .select('*')
                .eq('dive_id', diveId)
                .order('event_time', { ascending: true });

            if (eventsError) throw eventsError;

            setDive(diveData);
            setEvents(eventsData || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    const startEdit = (event: DiveEvent | null) => {
        if (!event) {
            setEditingEvent({ id: 'new', event_time: new Date().toISOString(), event_type: '', description: '', depth: 0 });
            setFormData({ time: '', depth: 0, event_type: '', description: '' });
        } else {
            setEditingEvent(event);
            setFormData({
                time: format(new Date(event.event_time), 'HH:mm:ss'),
                depth: event.depth,
                event_type: event.event_type,
                description: event.description || ''
            });
        }
    };

    const handleSaveEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingEvent) return;

        try {
            let baseDate = new Date();
            if (editingEvent.id !== 'new') {
                baseDate = new Date(editingEvent.event_time);
            } else if (dive?.date) {
                baseDate = new Date(dive.date);
            }

            const [hours, minutes, seconds] = formData.time.split(':').map(Number);
            const newDate = set(baseDate, {
                hours: hours || 0,
                minutes: minutes || 0,
                seconds: seconds || 0
            });

            if (editingEvent.id === 'new') {
                const { error } = await supabase.from('dive_events').insert([{
                    dive_id: diveId,
                    event_time: newDate.toISOString(),
                    depth: formData.depth,
                    event_type: formData.event_type,
                    description: formData.description
                }]);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('dive_events')
                    .update({
                        event_time: newDate.toISOString(),
                        depth: formData.depth,
                        event_type: formData.event_type,
                        description: formData.description
                    })
                    .eq('id', editingEvent.id);
                if (error) throw error;
            }

            setEditingEvent(null);
            fetchDiveDetails();
        } catch (error) {
            alert('Failed to save event');
            console.error(error);
        }
    };

    const handleDeleteEvent = async (id: string) => {
        if (!confirm('Are you sure you want to delete this event log?')) return;
        try {
            const { error } = await supabase.from('dive_events').delete().eq('id', id);
            if (error) throw error;
            fetchDiveDetails();
        } catch (error) {
            console.error(error);
            alert('Failed to delete event');
        }
    };

    const generatePDF = async () => {
        if (!contentRef.current || !dive) return null;

        try {
            // Temporarily remove transform for PDF generation
            const originalTransform = contentRef.current.style.transform;
            contentRef.current.style.transform = 'none';

            // Capture the A4 content as canvas
            const canvas = await html2canvas(contentRef.current, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });

            // Restore transform
            contentRef.current.style.transform = originalTransform;

            // Create PDF (A4 size: 210mm x 297mm)
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const imgData = canvas.toDataURL('image/png');
            const pdfWidth = 210;
            const pdfHeight = 297;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

            return pdf;
        } catch (error) {
            console.error('PDF generation failed:', error);
            alert('Failed to generate PDF. Please try again.');
            return null;
        }
    };

    const handleDownloadPDF = async () => {
        const pdf = await generatePDF();
        if (pdf && dive) {
            const fileName = `Dive_Log_${dive.dive_no}_${format(new Date(dive.date), 'yyyy-MM-dd')}.pdf`;
            pdf.save(fileName);
        }
    };

    const handleShare = async () => {
        if (!dive) return;

        const pdf = await generatePDF();
        if (!pdf) return;

        const fileName = `Dive_Log_${dive.dive_no}_${format(new Date(dive.date), 'yyyy-MM-dd')}.pdf`;

        // Convert PDF to blob
        const pdfBlob = pdf.output('blob');

        // Try to use Web Share API with file
        if (navigator.share && navigator.canShare) {
            const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

            if (navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        files: [file],
                        title: `Dive Log #${dive.dive_no}`,
                        text: `Dive report for ${dive.job?.job_name} on ${format(new Date(dive.date), 'dd MMM yyyy')}`
                    });
                    return;
                } catch (err) {
                    console.error('Share failed:', err);
                }
            }
        }

        // Fallback: Download the PDF
        pdf.save(fileName);
        alert('PDF downloaded! You can now share it via WhatsApp or email from your device.');
    };

    if (loading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-ocean-400" /></div>;
    if (!dive) return <div className="p-12 text-center text-white">Dive not found</div>;

    // Calculate Max Depth
    const calculatedMaxDepth = dive?.max_depth || (events.length > 0 ? Math.max(...events.map(e => e.depth)) : 0);

    return (
        <div className="min-h-screen bg-deep-900 flex flex-col items-center py-8 overflow-x-hidden font-sans print:bg-white print:p-0">
            <style>
                {`
                @media print {
                    @page { size: A4; margin: 0; }
                    body { -webkit-print-color-adjust: exact; }
                    .print-hidden { display: none !important; }
                    .a4-paper { 
                        box-shadow: none !important; 
                        margin: 0 !important;
                        width: 210mm !important;
                        height: 297mm !important;
                        transform: none !important;
                    }
                }
                .a4-paper {
                    width: 210mm;
                    min-height: 297mm;
                    background: white;
                    color: black;
                    padding: 20mm;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                    transform-origin: top center;
                }
                `}
            </style>

            {/* Action Bar */}
            <div className="w-full max-w-[210mm] flex justify-between items-center mb-6 px-4 print-hidden z-10">
                <button onClick={() => navigate(-1)} className="flex items-center text-ocean-300 hover:text-white transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </button>
                <div className="flex gap-2 flex-wrap justify-end">
                    <button
                        onClick={handleShare}
                        className="px-3 py-2 bg-green-700 text-white rounded hover:bg-green-600 flex items-center text-sm"
                    >
                        <Share2 className="w-4 h-4 mr-2" /> Share PDF
                    </button>
                    <button
                        onClick={handleDownloadPDF}
                        className="px-3 py-2 bg-blue-700 text-white rounded hover:bg-blue-600 flex items-center text-sm"
                    >
                        <Download className="w-4 h-4 mr-2" /> Download PDF
                    </button>
                    <button
                        onClick={() => setIsEditMode(!isEditMode)}
                        className={`px-3 py-2 rounded flex items-center transition-colors text-sm ${isEditMode ? 'bg-amber-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                    >
                        <Pencil className="w-4 h-4 mr-2" /> {isEditMode ? 'Done' : 'Edit'}
                    </button>
                    <button onClick={() => window.print()} className="bg-ocean-600 text-white px-3 py-2 rounded flex items-center hover:bg-ocean-500 text-sm">
                        <Printer className="w-4 h-4 mr-2" /> Print
                    </button>
                </div>
            </div>

            {/* A4 Document Container */}
            <div
                className="a4-paper"
                ref={contentRef}
                style={{ transform: `scale(${scale})` }}
            >

                {/* Document Header - Boxed */}
                <div className="border-2 border-black mb-6">
                    <div className="grid grid-cols-4 divide-x-2 divide-black">
                        {/* Contractor Logo Placeholder */}
                        <div className="col-span-1 h-32 flex items-center justify-center bg-gray-50 border-r-black">
                            <div className="text-center p-4">
                                <div className="w-full h-20 bg-gray-200 flex items-center justify-center border border-dashed border-gray-400">
                                    <span className="text-xs font-bold text-gray-500 uppercase px-2">Contractor Logo</span>
                                </div>
                            </div>
                        </div>

                        {/* Title */}
                        <div className="col-span-2 flex flex-col items-center justify-center p-4">
                            <h1 className="text-3xl font-bold uppercase tracking-widest text-center">Diving Operations Log</h1>
                            <p className="text-sm font-bold uppercase mt-2 tracking-wide text-slate-600">Offshore Division</p>
                        </div>

                        {/* Client Logo Placeholder */}
                        <div className="col-span-1 h-32 flex items-center justify-center bg-gray-50">
                            <div className="text-center p-4">
                                <div className="w-full h-20 bg-gray-200 flex items-center justify-center border border-dashed border-gray-400">
                                    <span className="text-xs font-bold text-gray-500 uppercase px-2">Client Logo</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Dive Details - Boxed Grid */}
                <div className="border-2 border-black mb-6 text-sm">
                    <div className="grid grid-cols-2 divide-x-2 divide-black border-b border-black">
                        <div className="flex p-0">
                            <div className="w-32 bg-gray-100 p-2 font-bold border-r border-black flex items-center">Job</div>
                            <div className="p-2 flex-1 flex items-center">{dive.job?.job_name}</div>
                        </div>
                        <div className="flex p-0">
                            <div className="w-32 bg-gray-100 p-2 font-bold border-r border-black flex items-center">Client</div>
                            <div className="p-2 flex-1 flex items-center">{dive.job?.client_name}</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 divide-x-2 divide-black border-b border-black">
                        <div className="flex p-0">
                            <div className="w-32 bg-gray-100 p-2 font-bold border-r border-black flex items-center">Location</div>
                            <div className="p-2 flex-1 flex items-center">{dive.job?.location}</div>
                        </div>
                        <div className="flex p-0">
                            <div className="w-32 bg-gray-100 p-2 font-bold border-r border-black flex items-center">Date</div>
                            <div className="p-2 flex-1 flex items-center">{format(new Date(dive.date), 'dd MMM yyyy')}</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 divide-x-2 divide-black border-b border-black">
                        <div className="flex p-0">
                            <div className="w-32 bg-gray-100 p-2 font-bold border-r border-black flex items-center">Diver</div>
                            <div className="p-2 flex-1 flex items-center">{dive.diver?.full_name} ({dive.diver?.rank})</div>
                        </div>
                        <div className="flex p-0">
                            <div className="w-32 bg-gray-100 p-2 font-bold border-r border-black flex items-center">Supervisor</div>
                            <div className="p-2 flex-1 flex items-center">{dive.supervisor?.full_name || 'N/A'}</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 divide-x-2 divide-black border-b border-black">
                        <div className="flex p-0">
                            <div className="w-32 bg-gray-100 p-2 font-bold border-r border-black flex items-center">Dive No</div>
                            <div className="p-2 flex-1 flex items-center">{dive.dive_no || '---'}</div>
                        </div>
                        <div className="flex p-0">
                            <div className="w-32 bg-gray-100 p-2 font-bold border-r border-black flex items-center">Max Depth</div>
                            <div className="p-2 flex-1 flex items-center font-bold">{calculatedMaxDepth} msw</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 divide-x-2 divide-black border-b border-black">
                        <div className="flex p-0">
                            <div className="w-32 bg-gray-100 p-2 font-bold border-r border-black flex items-center">Start Time</div>
                            <div className="p-2 flex-1 flex items-center">{dive.start_time?.slice(0, 5)}</div>
                        </div>
                        <div className="flex p-0">
                            <div className="w-32 bg-gray-100 p-2 font-bold border-r border-black flex items-center">End Time</div>
                            <div className="p-2 flex-1 flex items-center">{dive.end_time?.slice(0, 5)}</div>
                        </div>
                        <div className="flex p-0">
                            <div className="w-32 bg-gray-100 p-2 font-bold border-r border-black flex items-center">Bottom Time</div>
                            <div className="p-2 flex-1 flex items-center">{dive.bottom_time}</div>
                        </div>
                    </div>
                </div>

                {/* Events Table */}
                <div className="flex justify-between items-end mb-2">
                    <h3 className="font-bold text-lg uppercase">Time / Depth / Event Log</h3>
                    {isEditMode && (
                        <button onClick={() => startEdit(null)} className="text-sm bg-green-600 text-white px-3 py-1 rounded flex items-center hover:bg-green-700 print:hidden">
                            <Plus className="w-4 h-4 mr-1" /> Add Entry
                        </button>
                    )}
                </div>

                <div className="border-2 border-black mb-8">
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr className="bg-gray-100 border-b-2 border-black">
                                <th className="py-2 px-4 text-left font-bold w-32 border-r border-black">Time</th>
                                <th className="py-2 px-4 text-left font-bold w-24 border-r border-black">Depth</th>
                                <th className="py-2 px-4 text-left font-bold">Event / Observation</th>
                                {isEditMode && <th className="py-2 px-4 text-right font-bold w-24 border-l border-black print:hidden">Action</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {events.map((event) => (
                                <tr key={event.id} className={`border-b border-black/20 ${isEditMode ? 'hover:bg-amber-50' : 'even:bg-gray-50'}`}>
                                    <td className="py-2 px-4 font-mono border-r border-black/20">{format(new Date(event.event_time), 'HH:mm')}</td>
                                    <td className="py-2 px-4 font-mono border-r border-black/20">{event.depth}m</td>
                                    <td className="py-2 px-4">
                                        <span className="font-bold mr-2">{event.event_type}</span>
                                        {event.description && <span className="text-slate-700">- {event.description}</span>}
                                    </td>
                                    {isEditMode && (
                                        <td className="py-2 px-4 text-right border-l border-black/20 print:hidden">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => startEdit(event)} className="p-1 text-ocean-600 hover:bg-ocean-100 rounded">
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDeleteEvent(event.id)} className="p-1 text-red-600 hover:bg-red-100 rounded">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-8 mt-12">
                    <div className="border-2 border-black p-4 h-40 flex flex-col justify-between">
                        <p className="font-bold uppercase text-sm">Diver Signature</p>
                        <div className="border-b-2 border-black w-full mb-2"></div>
                        <p className="text-xs text-center">{dive.diver?.full_name}</p>
                    </div>
                    <div className="border-2 border-black p-4 h-40 flex flex-col justify-between">
                        <p className="font-bold uppercase text-sm">Supervisor Signature</p>
                        <div className="border-b-2 border-black w-full mb-2"></div>
                        <p className="text-xs text-center">{dive.supervisor?.full_name || '________________'}</p>
                    </div>
                </div>

                {/* Edit Modal */}
                {editingEvent && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center print:hidden z-50">
                        <div className="bg-white p-6 rounded-xl w-full max-w-sm shadow-2xl">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-lg">{editingEvent.id === 'new' ? 'Add New Entry' : 'Edit Event'}</h3>
                                <button onClick={() => setEditingEvent(null)}><X className="w-5 h-5 text-slate-400" /></button>
                            </div>
                            <form onSubmit={handleSaveEvent} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Time (HH:MM:SS)</label>
                                    <input
                                        type="text"
                                        className="w-full border border-slate-300 rounded p-2 font-mono"
                                        value={formData.time}
                                        onChange={e => setFormData({ ...formData, time: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Depth (m)</label>
                                    <input
                                        type="number"
                                        className="w-full border border-slate-300 rounded p-2"
                                        value={formData.depth}
                                        onChange={e => setFormData({ ...formData, depth: parseFloat(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Event Type</label>
                                    <input
                                        type="text"
                                        className="w-full border border-slate-300 rounded p-2"
                                        value={formData.event_type}
                                        onChange={e => setFormData({ ...formData, event_type: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
                                    <textarea
                                        className="w-full border border-slate-300 rounded p-2"
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>
                                <button type="submit" className="w-full bg-ocean-600 text-white font-bold py-3 rounded-lg hover:bg-ocean-700">
                                    {editingEvent.id === 'new' ? 'Add Entry' : 'Save Changes'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
            {/* End A4 Paper Container */}
        </div>
    );
}
