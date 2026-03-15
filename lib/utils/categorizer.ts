// Smart Expense Categorizer (Dump Box Parser)

export type ExpenseCategory = 'needs' | 'wants' | 'investments' | 'unknown';

export interface ParsedExpense {
    name: string;
    amount: number;
    category: ExpenseCategory;
    rawText: string;
}

// Keywords for auto-categorization in Thai context
const keywords = {
    needs: [
        'บ้าน', 'เช่า', 'น้ำ', 'ไฟ', 'เน็ต', 'โทรศัพท์', 'บัตร', 'หนี้', 'รถ', 'น้ำมัน',
        'เดินทาง', 'bts', 'mrt', 'ยา', 'หมอ', 'กิน', 'ข้าว', 'อาหาร', 'ของใช้', 'สบู่', 'แชมพู'
    ],
    wants: [
        'ช้อปปิ้ง', 'เสื้อผ้า', 'เที่ยว', 'หนัง', 'เกม', 'กาแฟ', 'ชาไข่มุก', 'คาเฟ่',
        'บุฟเฟต์', 'ปาร์ตี้', 'เหล้า', 'เบียร์', 'คอนเสิร์ต', 'ของเล่น', 'ฟิกเกอร์',
        'gym', 'member', 'fitness', 'ยิม', 'ฟิตเนส'
    ],
    investments: [
        'หุ้น', 'คริปโต', 'crypto', 'ทอง', 'กองทุน', 'rmf', 'ssf', 'ประกัน', 'ออม', 'เงินเก็บ', 'ฝากประจำ'
    ]
};

/**
 * Guesses the category of an expense based on its name matching Thai keywords.
 */
export function guessCategory(expenseName: string): ExpenseCategory {
    const normalizedStr = expenseName.toLowerCase().replace(/\s+/g, '');

    for (const keyword of keywords.needs) {
        if (normalizedStr.includes(keyword)) return 'needs';
    }
    for (const keyword of keywords.investments) {
        if (normalizedStr.includes(keyword)) return 'investments';
    }
    for (const keyword of keywords.wants) {
        if (normalizedStr.includes(keyword)) return 'wants';
    }

    return 'unknown';
}

/**
 * Parses a free-form text dump like "ค่าบ้าน 8000 ค่ากิน 5000 กาแฟ 1000"
 * Extracts the item name and the amount, and assigns a category.
 */
export function parseExpenseDump(rawText: string): ParsedExpense[] {
    if (!rawText || rawText.trim() === '') return [];

    const results: ParsedExpense[] = [];

    // Split the raw text by commas or newlines to process item by item
    const lines = rawText.split(/[,\n]/);

    for (const line of lines) {
        if (!line.trim()) continue;

        // Extract all numbers (e.g., 60 and 30 from "กาแฟ 60 บาท 30 วัน" or 200 and 20 from "เดินทาง 200 * 20")
        const numberMatches = [...line.matchAll(/(\d+(?:,\d+)*(?:\.\d+)?)/g)];
        if (numberMatches.length === 0) continue;

        let amount = 0;
        
        // If 1 number, it's just the price
        if (numberMatches.length === 1) {
            amount = parseFloat(numberMatches[0][1].replace(/,/g, ''));
        } 
        // If 2 or more numbers, assume it's a Price * Quantity/Frequency calculation
        else if (numberMatches.length >= 2) {
            const num1 = parseFloat(numberMatches[0][1].replace(/,/g, ''));
            const num2 = parseFloat(numberMatches[1][1].replace(/,/g, ''));
            amount = num1 * num2;
        }

        // Clean up the name: Remove numbers, math symbols, and common unit words
        let rawName = line
            .replace(/[0-9.,*xX]/g, '') // Remove numbers and typical multiplier symbols
            .replace(/\b(บาท|bath|baht|วัน|day|days|เดือน|month|months|ปี|year|years)\b/gi, '') // Remove common units
            .replace(/^[:=\-\s]+|[:=\-\s]+$/g, '') // Trim leading/trailing punctuation and spaces
            .replace(/\s+/g, ' ') // Normalize spaces
            .trim();

        // If the name ended up empty after stripping (e.g., user just typed "100"), use a fallback
        if (!rawName) rawName = 'Item';

        if (!isNaN(amount)) {
            results.push({
                name: rawName,
                amount: amount,
                category: guessCategory(rawName),
                rawText: line.trim()
            });
        }
    }

    return results;
}
