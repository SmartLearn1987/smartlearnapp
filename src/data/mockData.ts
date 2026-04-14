export interface Subject {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  courseCount: number;
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  content: ContentBlock[];
  quiz: QuizQuestion[];
  flashcards: Flashcard[];
  summary: string;
  keyPoints: string[];
  vocabulary: VocabWord[];
}

export interface ContentBlock {
  type: "heading" | "paragraph" | "quote" | "image-desc" | "vocab" | "divider";
  text: string;
  level?: number;
}

export interface VocabWord {
  word: string;
  meaning: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
}

export interface Course {
  id: string;
  subjectId: string;
  title: string;
  description: string;
  grade: number;
  semester: number;
  publisher: string;
  lessons: Lesson[];
}

export const subjects: Subject[] = [
  { id: "tieng-viet", name: "Tiếng Việt", icon: "📖", color: "bg-primary", description: "Học đọc, viết và ngữ pháp tiếng Việt", courseCount: 1 },
  { id: "toan", name: "Toán", icon: "🔢", color: "bg-secondary", description: "Số học, hình học và giải toán", courseCount: 0 },
  { id: "tnxh", name: "Tự nhiên & Xã hội", icon: "🌿", color: "bg-accent", description: "Khám phá thế giới xung quanh", courseCount: 0 },
  { id: "dao-duc", name: "Đạo đức", icon: "⭐", color: "bg-quiz", description: "Rèn luyện phẩm chất tốt đẹp", courseCount: 0 },
];

export const courses: Course[] = [
  {
    id: "tv4-kntt-t2",
    subjectId: "tieng-viet",
    title: "Tiếng Việt 4 - Kết nối tri thức - Tập 2",
    description: "Sách giáo khoa Tiếng Việt lớp 4, bộ Kết nối tri thức với cuộc sống, Tập 2",
    grade: 4,
    semester: 2,
    publisher: "Kết nối tri thức",
    lessons: [
      // === CHỦ ĐỀ: SỐNG ĐỂ YÊU THƯƠNG ===
      {
        id: "tv4t2-bai1",
        title: "Bài 1: Hải Thượng Lãn Ông",
        description: "Tuần 19 – Chủ đề: Sống để yêu thương (trang 8-11)",
        completed: false,
        content: [
          { type: "heading", text: "Hải Thượng Lãn Ông", level: 1 },
          { type: "paragraph", text: "Hải Thượng Lãn Ông là một thầy thuốc nổi tiếng của nước ta ở thế kỉ XVII." },
          { type: "paragraph", text: "Ông là người thông minh, học rộng. Khi còn trẻ, có lần bị ốm nặng, ông được một thầy thuốc giỏi chữa khỏi. Nhận thấy rằng biết chữa bệnh không chỉ cứu mình mà còn giúp được người đời, ông đã quyết học nghề y. Lên kinh đô nhưng không tìm được thầy giỏi để học, ông về quê \"đóng cửa để đọc sách\"; vừa tự học vừa chữa bệnh giúp dân." },
          { type: "paragraph", text: "Ông không quản ngày đêm, mưa nắng, trèo đèo lội suối đi chữa bệnh cứu người. Đối với người nghèo, hoàn cảnh khó khăn, ông thường khám bệnh và cho thuốc không lấy tiền." },
          { type: "paragraph", text: "Có lần, một người thuyền chài nghèo có đứa con nhỏ bị bệnh nặng nhưng không có tiền chữa trị. Khi bệnh tình của đứa trẻ nguy cấp, người thuyền chài chạy đến nhờ cậy Hải Thượng Lãn Ông. Ông đã đi lại thăm khám, thuốc thang ròng rã hơn một tháng trời, nhờ vậy mà bệnh của đứa trẻ thuyên giảm. Không những không lấy tiền, ông còn cho gia đình họ gạo, củi, dầu đèn,..." },
          { type: "paragraph", text: "Bên cạnh việc làm thuốc, chữa bệnh, Hải Thượng Lãn Ông cũng dành nhiều công sức nghiên cứu, viết sách, để lại cho đời nhiều tác phẩm lớn, có giá trị về y học, văn hoá và lịch sử. Ông được coi là một bậc danh y của Việt Nam." },
          { type: "quote", text: "Theo Nguyễn Liêm" },
        ],
        vocabulary: [
          { word: "Hải Thượng Lãn Ông", meaning: "(1720 – 1791): tên thật là Lê Hữu Trác" },
          { word: "Nghề y", meaning: "Nghề khám và chữa bệnh" },
          { word: "Danh y", meaning: "Thầy thuốc giỏi và nổi tiếng" },
        ],
        quiz: [
          { id: "tv4-q1", question: "Hải Thượng Lãn Ông là ai?", options: ["Một nhà thơ nổi tiếng", "Một thầy thuốc nổi tiếng", "Một vị tướng quân", "Một nhà khoa học"], correctIndex: 1, explanation: "Hải Thượng Lãn Ông là một thầy thuốc nổi tiếng của nước ta ở thế kỉ XVII." },
          { id: "tv4-q2", question: "Vì sao Hải Thượng Lãn Ông quyết học nghề y?", options: ["Vì gia đình bắt buộc", "Vì muốn kiếm nhiều tiền", "Vì nhận thấy chữa bệnh cứu mình và giúp người", "Vì được vua giao nhiệm vụ"], correctIndex: 2, explanation: "Nhận thấy rằng biết chữa bệnh không chỉ cứu mình mà còn giúp được người đời, ông đã quyết học nghề y." },
          { id: "tv4-q3", question: "Hải Thượng Lãn Ông đã học nghề y như thế nào?", options: ["Học tại trường", "Tự học bằng cách đọc sách", "Học ở nước ngoài", "Học từ cha mẹ"], correctIndex: 1, explanation: "Lên kinh đô nhưng không tìm được thầy giỏi để học, ông về quê \"đóng cửa để đọc sách\"; vừa tự học vừa chữa bệnh giúp dân." },
          { id: "tv4-q4", question: "Ông đã giúp đỡ người thuyền chài nghèo như thế nào?", options: ["Cho tiền chữa bệnh", "Thăm khám miễn phí hơn 1 tháng và cho thêm gạo, củi", "Giới thiệu bác sĩ khác", "Cho mượn thuyền"], correctIndex: 1, explanation: "Ông đã đi lại thăm khám, thuốc thang ròng rã hơn một tháng trời. Không lấy tiền, còn cho gạo, củi, dầu đèn." },
        ],
        flashcards: [
          { id: "tv4-f1", front: "Hải Thượng Lãn Ông", back: "Tên thật là Lê Hữu Trác (1720-1791), là một bậc danh y nổi tiếng của Việt Nam ở thế kỉ XVII" },
          { id: "tv4-f2", front: "Danh y", back: "Thầy thuốc giỏi và nổi tiếng" },
          { id: "tv4-f3", front: "Nghề y", back: "Nghề khám và chữa bệnh" },
          { id: "tv4-f4", front: "\"Thầy thuốc như mẹ hiền\"", back: "Thầy thuốc có tấm lòng nhân ái, chữa bệnh cứu người như người mẹ chăm sóc con" },
          { id: "tv4-f5", front: "Cách học của Hải Thượng Lãn Ông?", back: "\"Đóng cửa để đọc sách\" - tự học, vừa đọc sách vừa chữa bệnh giúp dân" },
        ],
        summary: "Bài đọc kể về cuộc đời Hải Thượng Lãn Ông - Lê Hữu Trác, một bậc danh y Việt Nam thế kỉ XVII. Ông kiên trì tự học nghề y, hết lòng chữa bệnh cứu người, đặc biệt thương yêu người nghèo. Ông còn để lại nhiều tác phẩm có giá trị về y học, văn hóa và lịch sử.",
        keyPoints: [
          "Hải Thượng Lãn Ông tên thật là Lê Hữu Trác (1720-1791)",
          "Ông tự học nghề y bằng cách đọc sách và thực hành chữa bệnh",
          "Ông chữa bệnh miễn phí cho người nghèo, còn giúp thêm lương thực",
          "Ông viết nhiều tác phẩm y học có giá trị cho đời sau",
          "Ông được coi là bậc danh y của Việt Nam",
        ],
      },
      {
        id: "tv4t2-bai2",
        title: "Bài 2: Vệt phấn trên mặt bàn",
        description: "Tuần 19 – Chủ đề: Sống để yêu thương (trang 12-15)",
        completed: false,
        content: [
          { type: "heading", text: "Vệt phấn trên mặt bàn", level: 1 },
          { type: "paragraph", text: "Lớp Minh có thêm học sinh mới. Đó là một bạn gái có cái tên rất ngộ: Thi Ca. Cô giáo xếp Thi Ca ngồi ngay cạnh Minh. Minh tò mò ngó mái tóc xù lông nhím của bạn, định bụng sẽ làm quen với \"người hàng xóm\" mới thật vui vẻ." },
          { type: "paragraph", text: "Nhưng cô bạn tóc xù toàn làm cậu bực mình. Trong lúc Minh bặm môi, nắn nót những dòng chữ trên trang vở thì hai cái cùi chỏ đụng nhau đánh cộp làm chữ nhảy chồm lên, rớt khỏi dòng. Tất cả rắc rối là do Thi Ca viết tay trái. Hai, ba lần, Minh phải kêu lên:" },
          { type: "quote", text: "– Bạn xê ra chút coi! Đụng tay mình rồi nè!" },
          { type: "paragraph", text: "Tới lần thứ tư, Minh lấy phấn kẻ một đường chia đôi mặt bàn:" },
          { type: "quote", text: "– Đây là ranh giới. Bạn không được để tay thò qua chỗ mình nhé!" },
          { type: "paragraph", text: "Thi Ca nhìn đường phấn, gương mặt thoáng buồn. Đường ranh giới cứ thế tồn tại trên mặt bàn hết một tuần." },
          { type: "paragraph", text: "Hôm ấy, trống vào lớp lâu rồi mà không thấy Thi Ca xuất hiện. Thì ra bạn ấy phải vào bệnh viện. Cô giáo nói:" },
          { type: "quote", text: "– Hi vọng lần này bác sĩ sẽ chữa lành cánh tay mặt để bạn không phải viết bằng tay trái nữa!" },
          { type: "paragraph", text: "Lời của cô giáo làm Minh chợt nhớ ra Thi Ca hay giấu bàn tay mặt trong hộc bàn. Minh nhớ ánh mắt buồn của bạn lúc nhìn Minh vạch đường phấn trắng. Càng nhớ càng ân hận. Mím môi, Minh đè mạnh chiếc khăn xoá vệt phấn trên mặt bàn." },
          { type: "quote", text: "\"Mau về nhé, Thi Ca!\" – Minh nói với vệt phấn chỉ còn là một đường mờ nhạt trên mặt gỗ lốm đốm vân nâu." },
          { type: "paragraph", text: "(Theo Nguyễn Thị Kim Hoà)" },
        ],
        vocabulary: [
          { word: "Tay mặt", meaning: "Tay phải" },
          { word: "Ranh giới", meaning: "Đường chia cách giữa hai bên" },
          { word: "Ân hận", meaning: "Cảm giác buồn, tiếc khi nhận ra mình đã làm sai" },
        ],
        quiz: [
          { id: "tv4-q5", question: "Minh có suy nghĩ gì khi cô giáo xếp Thi Ca ngồi cạnh?", options: ["Không muốn ngồi cùng", "Muốn làm quen vui vẻ", "Muốn xin đổi chỗ", "Không quan tâm"], correctIndex: 1, explanation: "Minh định bụng sẽ làm quen với \"người hàng xóm\" mới thật vui vẻ." },
          { id: "tv4-q6", question: "Vì sao Thi Ca hay đụng vào tay Minh?", options: ["Vì Thi Ca cố tình", "Vì bàn quá nhỏ", "Vì Thi Ca viết tay trái", "Vì Thi Ca nghịch ngợm"], correctIndex: 2, explanation: "Tất cả rắc rối là do Thi Ca viết tay trái." },
          { id: "tv4-q7", question: "Minh đã làm gì khi bị đụng tay nhiều lần?", options: ["Nói với cô giáo", "Kẻ đường phấn chia đôi mặt bàn", "Xin đổi chỗ ngồi", "Đẩy Thi Ca ra xa"], correctIndex: 1, explanation: "Tới lần thứ tư, Minh lấy phấn kẻ một đường chia đôi mặt bàn." },
          { id: "tv4-q8", question: "Khi biết Thi Ca phải đi bệnh viện chữa tay, Minh cảm thấy thế nào?", options: ["Vui vì không bị đụng nữa", "Ân hận và xóa vệt phấn", "Không quan tâm", "Tức giận"], correctIndex: 1, explanation: "Càng nhớ càng ân hận. Mím môi, Minh đè mạnh chiếc khăn xoá vệt phấn trên mặt bàn." },
        ],
        flashcards: [
          { id: "tv4-f6", front: "Vì sao Thi Ca viết tay trái?", back: "Vì cánh tay mặt (tay phải) của Thi Ca bị bệnh, phải vào bệnh viện chữa trị" },
          { id: "tv4-f7", front: "Tay mặt", back: "Tay phải" },
          { id: "tv4-f8", front: "Bài học từ câu chuyện \"Vệt phấn trên mặt bàn\"", back: "Cần biết cảm thông, thấu hiểu hoàn cảnh của người khác trước khi phán xét" },
          { id: "tv4-f9", front: "Tính từ chỉ đặc điểm sự vật vs hoạt động?", back: "Sự vật: trắng, buồn, mờ nhạt. Hoạt động: mạnh (đè mạnh)" },
        ],
        summary: "Câu chuyện kể về Minh và bạn mới Thi Ca. Minh bực mình vì Thi Ca viết tay trái hay đụng vào tay cậu nên kẻ đường phấn chia đôi bàn. Khi biết Thi Ca phải vào viện chữa tay phải, Minh ân hận và xóa đường phấn. Bài học: cần biết cảm thông, thấu hiểu hoàn cảnh của người khác.",
        keyPoints: [
          "Thi Ca là học sinh mới, viết tay trái vì tay phải bị bệnh",
          "Minh kẻ đường phấn chia đôi mặt bàn vì bực mình",
          "Khi biết lý do Thi Ca viết tay trái, Minh ân hận và xóa vệt phấn",
          "Bài học: cần cảm thông, thấu hiểu trước khi phán xét",
        ],
      },
      {
        id: "tv4t2-bai3",
        title: "Bài 3: Ông Bụt đã đến",
        description: "Tuần 20 – Chủ đề: Sống để yêu thương (trang 16-19)",
        completed: false,
        content: [
          { type: "heading", text: "Ông Bụt đã đến", level: 1 },
          { type: "paragraph", text: "Câu chuyện kể về tấm lòng yêu thương và giúp đỡ người khác. Trong cuộc sống, những hành động tốt đẹp, dù nhỏ bé, cũng có thể mang lại niềm vui và ấm áp cho mọi người xung quanh." },
          { type: "paragraph", text: "Bài học giúp các em hiểu về hai thành phần chính của câu: chủ ngữ và vị ngữ, đồng thời luyện viết đoạn văn nêu tình cảm, cảm xúc về một người gần gũi, thân thiết." },
        ],
        vocabulary: [
          { word: "Chủ ngữ", meaning: "Thành phần chỉ sự vật, hiện tượng được nói đến trong câu" },
          { word: "Vị ngữ", meaning: "Thành phần nêu hoạt động, trạng thái, đặc điểm của chủ ngữ" },
        ],
        quiz: [
          { id: "tv4-q9", question: "Câu có mấy thành phần chính?", options: ["1", "2", "3", "4"], correctIndex: 1, explanation: "Câu có 2 thành phần chính: chủ ngữ và vị ngữ." },
          { id: "tv4-q10", question: "Trong câu \"Hải Thượng Lãn Ông chữa bệnh cho người nghèo\", chủ ngữ là gì?", options: ["chữa bệnh", "người nghèo", "Hải Thượng Lãn Ông", "cho"], correctIndex: 2, explanation: "Chủ ngữ là \"Hải Thượng Lãn Ông\" - chỉ người được nói đến." },
        ],
        flashcards: [
          { id: "tv4-f10", front: "Chủ ngữ", back: "Thành phần chỉ sự vật, hiện tượng được nói đến trong câu. Trả lời câu hỏi: Ai? Cái gì? Con gì?" },
          { id: "tv4-f11", front: "Vị ngữ", back: "Thành phần nêu hoạt động, trạng thái, đặc điểm của chủ ngữ. Trả lời câu hỏi: Làm gì? Thế nào? Là gì?" },
        ],
        summary: "Bài học giới thiệu câu chuyện về tấm lòng yêu thương và giúp đỡ lẫn nhau. Đồng thời học về hai thành phần chính của câu: chủ ngữ và vị ngữ.",
        keyPoints: [
          "Câu có hai thành phần chính: chủ ngữ và vị ngữ",
          "Chủ ngữ trả lời câu hỏi: Ai? Cái gì? Con gì?",
          "Vị ngữ trả lời câu hỏi: Làm gì? Thế nào? Là gì?",
        ],
      },
      {
        id: "tv4t2-bai4",
        title: "Bài 4: Quả ngọt cuối mùa",
        description: "Tuần 20 – Chủ đề: Sống để yêu thương (trang 20-23)",
        completed: false,
        content: [
          { type: "heading", text: "Quả ngọt cuối mùa", level: 1 },
          { type: "paragraph", text: "Bài đọc kể về tình cảm gia đình ấm áp. Bà luôn dành những quả ngọt cuối mùa cho cháu, thể hiện tình yêu thương sâu sắc giữa hai thế hệ." },
          { type: "paragraph", text: "Phần luyện tập giúp các em tìm ý cho đoạn văn nêu tình cảm, cảm xúc về một nhân vật trong văn học." },
        ],
        vocabulary: [],
        quiz: [
          { id: "tv4-q11", question: "Bài đọc \"Quả ngọt cuối mùa\" nói về tình cảm gì?", options: ["Tình bạn", "Tình thầy trò", "Tình cảm gia đình", "Tình yêu quê hương"], correctIndex: 2, explanation: "Bài đọc nói về tình cảm gia đình, đặc biệt giữa bà và cháu." },
        ],
        flashcards: [
          { id: "tv4-f12", front: "Đoạn văn nêu tình cảm, cảm xúc cần có gì?", back: "Câu chủ đề nêu tình cảm, các câu giải thích/minh họa, và câu kết" },
        ],
        summary: "Bài đọc về tình cảm bà cháu ấm áp. Luyện tập viết đoạn văn nêu tình cảm, cảm xúc về nhân vật văn học.",
        keyPoints: [
          "Tình cảm gia đình là tình cảm thiêng liêng, cao quý",
          "Học cách viết đoạn văn nêu tình cảm, cảm xúc",
        ],
      },
      // === CHỦ ĐỀ: UỐNG NƯỚC NHỚ NGUỒN ===
      {
        id: "tv4t2-bai9",
        title: "Bài 9: Sự tích con Rồng cháu Tiên",
        description: "Tuần 23 – Chủ đề: Uống nước nhớ nguồn (trang 40-43)",
        completed: false,
        content: [
          { type: "heading", text: "Sự tích con Rồng cháu Tiên", level: 1 },
          { type: "paragraph", text: "Ngày xưa, ở miền đất Lạc Việt có một vị thần tên là Lạc Long Quân. Thần mình rồng, thường ở dưới nước, thỉnh thoảng lên sống trên cạn, sức khoẻ vô địch, có nhiều phép lạ. Bấy giờ, ở vùng núi cao có nàng Âu Cơ xinh đẹp tuyệt trần, nghe vùng đất Lạc Việt có nhiều hoa thơm cỏ lạ bèn tìm đến thăm. Hai người gặp nhau, kết thành vợ chồng." },
          { type: "paragraph", text: "Ít lâu sau, Âu Cơ có mang. Đến kì sinh, chuyện thật lạ, nàng sinh ra cái bọc trăm trứng. Trăm trứng nở ra một trăm người con hồng hào, đẹp đẽ lạ thường. Đàn con lớn nhanh như thổi, mặt mũi khôi ngô, khoẻ mạnh như thần." },
          { type: "paragraph", text: "Sống với nhau được ít lâu, Lạc Long Quân bàn với vợ:" },
          { type: "quote", text: "– Ta vốn nòi rồng ở miền nước thẳm, nàng là dòng tiên ở chốn non cao. Kẻ trên cạn, người dưới nước, tập quán khác nhau, khó mà ở cùng nhau lâu dài được. Nay ta đem năm mươi con xuống biển, nàng đưa năm mươi con lên núi, chia nhau cai quản các phương, khi có việc thì giúp đỡ lẫn nhau, đừng quên lời hẹn." },
          { type: "paragraph", text: "Một trăm người con của Lạc Long Quân và Âu Cơ sau này trở thành tổ tiên của người Việt. Người con trưởng theo Âu Cơ được tôn lên làm vua, lấy hiệu là Hùng Vương, đóng đô ở đất Phong Châu, đặt tên nước là Văn Lang." },
          { type: "paragraph", text: "Cũng bởi sự tích này mà về sau, người Việt ta thường tự hào xưng là con Rồng cháu Tiên và thân mật gọi nhau là đồng bào." },
          { type: "quote", text: "Theo Nguyễn Đổng Chi" },
        ],
        vocabulary: [
          { word: "Miền đất Lạc Việt", meaning: "Miền đất mà người Lạc Việt sinh sống, chủ yếu thuộc Bắc Bộ nước ta ngày nay" },
          { word: "Phong Châu", meaning: "Tên gọi một vùng đất cổ, nay thuộc tỉnh Phú Thọ" },
          { word: "Đồng bào", meaning: "(cùng một bọc) Những người cùng giống nòi, cùng đất nước" },
          { word: "Khôi ngô", meaning: "Vẻ mặt sáng sủa, đẹp đẽ" },
          { word: "Tập quán", meaning: "Thói quen, phong tục đã có từ lâu" },
        ],
        quiz: [
          { id: "tv4-q12", question: "Lạc Long Quân được giới thiệu như thế nào?", options: ["Nòi tiên, sống trên núi", "Mình rồng, sống dưới nước, sức khỏe vô địch", "Người thường, sống ở đồng bằng", "Thần sấm, sống trên trời"], correctIndex: 1, explanation: "Lạc Long Quân mình rồng, thường ở dưới nước, sức khoẻ vô địch, có nhiều phép lạ." },
          { id: "tv4-q13", question: "Âu Cơ sinh ra gì?", options: ["Một người con trai", "Hai người con", "Cái bọc trăm trứng", "Mười người con"], correctIndex: 2, explanation: "Âu Cơ sinh ra cái bọc trăm trứng, nở ra 100 người con." },
          { id: "tv4-q14", question: "\"Đồng bào\" có nghĩa là gì?", options: ["Cùng làng", "Cùng một bọc - cùng giống nòi", "Cùng lớp", "Cùng họ"], correctIndex: 1, explanation: "Đồng bào nghĩa là cùng một bọc, chỉ những người cùng giống nòi, cùng đất nước." },
          { id: "tv4-q15", question: "Người con trưởng được tôn lên làm vua lấy hiệu là gì?", options: ["Lạc Vương", "Âu Vương", "Hùng Vương", "Long Vương"], correctIndex: 2, explanation: "Người con trưởng theo Âu Cơ được tôn lên làm vua, lấy hiệu là Hùng Vương." },
          { id: "tv4-q16", question: "Câu ca dao nào liên quan đến câu chuyện này?", options: ["Công cha như núi Thái Sơn", "Dù ai đi ngược về xuôi, Nhớ ngày giỗ Tổ mùng Mười tháng Ba", "Bầu ơi thương lấy bí cùng", "Một cây làm chẳng nên non"], correctIndex: 1, explanation: "Câu ca dao nhắc đến ngày giỗ Tổ Hùng Vương mùng 10 tháng 3 âm lịch." },
        ],
        flashcards: [
          { id: "tv4-f13", front: "Lạc Long Quân", back: "Vị thần mình rồng, sống dưới nước, sức khỏe vô địch, có nhiều phép lạ – cha tổ của người Việt" },
          { id: "tv4-f14", front: "Âu Cơ", back: "Nàng tiên xinh đẹp tuyệt trần ở vùng núi cao – mẹ tổ của người Việt" },
          { id: "tv4-f15", front: "Bọc trăm trứng", back: "Âu Cơ sinh ra bọc trăm trứng, nở 100 con – biểu tượng đoàn kết dân tộc" },
          { id: "tv4-f16", front: "Hùng Vương", back: "Hiệu của người con trưởng theo Âu Cơ, vua đầu tiên của nước Văn Lang, đóng đô ở Phong Châu" },
          { id: "tv4-f17", front: "Đồng bào", back: "Cùng một bọc – chỉ người cùng giống nòi, cùng đất nước. Người Việt gọi nhau là đồng bào" },
          { id: "tv4-f18", front: "Con Rồng cháu Tiên", back: "Người Việt tự hào xưng là con Rồng cháu Tiên vì tổ tiên là Lạc Long Quân (nòi rồng) và Âu Cơ (dòng tiên)" },
        ],
        summary: "Sự tích kể về Lạc Long Quân (nòi rồng) và Âu Cơ (dòng tiên) kết duyên, sinh ra bọc trăm trứng nở trăm con. 50 con theo cha xuống biển, 50 con theo mẹ lên núi. Người con trưởng làm vua Hùng Vương, lập nước Văn Lang. Người Việt tự hào là con Rồng cháu Tiên, gọi nhau là đồng bào.",
        keyPoints: [
          "Lạc Long Quân: nòi rồng, sống dưới nước, sức khỏe vô địch",
          "Âu Cơ: dòng tiên, xinh đẹp tuyệt trần",
          "Sinh bọc trăm trứng → biểu tượng đoàn kết dân tộc",
          "50 con xuống biển, 50 con lên núi → người Việt có mặt khắp nơi",
          "Hùng Vương lập nước Văn Lang, đóng đô ở Phong Châu",
          "Người Việt xưng \"con Rồng cháu Tiên\", gọi nhau là \"đồng bào\"",
        ],
      },
      // === CHỦ ĐỀ: QUÊ HƯƠNG TRONG TÔI ===
      {
        id: "tv4t2-bai17",
        title: "Bài 17: Cây đa quê hương",
        description: "Tuần 28 – Chủ đề: Quê hương trong tôi (trang 80-84)",
        completed: false,
        content: [
          { type: "heading", text: "Cây đa quê hương", level: 1 },
          { type: "paragraph", text: "Bài đọc miêu tả hình ảnh cây đa – biểu tượng quen thuộc của làng quê Việt Nam. Cây đa gắn liền với tuổi thơ, với những kỷ niệm đẹp về quê hương." },
          { type: "paragraph", text: "Phần luyện từ và câu giới thiệu về trạng ngữ chỉ phương tiện, cùng với cách viết bài văn miêu tả cây cối." },
        ],
        vocabulary: [
          { word: "Trạng ngữ", meaning: "Thành phần phụ của câu, bổ sung thông tin về thời gian, nơi chốn, nguyên nhân, mục đích, phương tiện" },
          { word: "Trạng ngữ chỉ phương tiện", meaning: "Trạng ngữ cho biết phương tiện, cách thức thực hiện hành động (Bằng gì? Với cái gì?)" },
        ],
        quiz: [
          { id: "tv4-q17", question: "Trạng ngữ chỉ phương tiện trả lời câu hỏi gì?", options: ["Khi nào?", "Ở đâu?", "Bằng gì? Với cái gì?", "Vì sao?"], correctIndex: 2, explanation: "Trạng ngữ chỉ phương tiện trả lời câu hỏi: Bằng gì? Với cái gì?" },
          { id: "tv4-q18", question: "Trong câu \"Bằng chiếc xe đạp cũ, bố đưa em đến trường\", trạng ngữ là gì?", options: ["bố đưa em", "đến trường", "Bằng chiếc xe đạp cũ", "em đến trường"], correctIndex: 2, explanation: "\"Bằng chiếc xe đạp cũ\" là trạng ngữ chỉ phương tiện." },
        ],
        flashcards: [
          { id: "tv4-f19", front: "Trạng ngữ chỉ phương tiện", back: "Bổ sung thông tin về phương tiện, cách thức. Trả lời: Bằng gì? Với cái gì?\nVD: Bằng chiếc xe đạp cũ, bố đưa em đến trường." },
          { id: "tv4-f20", front: "Các loại trạng ngữ đã học", back: "1. Thời gian (Khi nào?)\n2. Nơi chốn (Ở đâu?)\n3. Nguyên nhân (Vì sao?)\n4. Mục đích (Để làm gì?)\n5. Phương tiện (Bằng gì?)" },
        ],
        summary: "Bài đọc về hình ảnh cây đa quê hương, biểu tượng của làng quê Việt Nam. Học về trạng ngữ chỉ phương tiện và cách viết bài văn miêu tả cây cối.",
        keyPoints: [
          "Cây đa là biểu tượng quen thuộc của làng quê Việt Nam",
          "Trạng ngữ chỉ phương tiện trả lời: Bằng gì? Với cái gì?",
          "Bài văn miêu tả cây cối cần: mở bài, thân bài (tả bao quát, tả chi tiết), kết bài",
        ],
      },
      {
        id: "tv4t2-bai19",
        title: "Bài 19: Đi hội chùa Hương",
        description: "Tuần 29 – Chủ đề: Quê hương trong tôi (trang 89-92)",
        completed: false,
        content: [
          { type: "heading", text: "Đi hội chùa Hương", level: 1 },
          { type: "paragraph", text: "Bài đọc miêu tả cảnh đẹp trên đường đi hội chùa Hương – một trong những danh thắng nổi tiếng của Việt Nam." },
          { type: "paragraph", text: "Phần luyện từ và câu giới thiệu về dấu ngoặc kép và cách sử dụng." },
        ],
        vocabulary: [
          { word: "Dấu ngoặc kép", meaning: "Dấu câu dùng để đánh dấu lời nói trực tiếp, tên tác phẩm, hoặc từ ngữ dùng với ý nghĩa đặc biệt" },
        ],
        quiz: [
          { id: "tv4-q19", question: "Dấu ngoặc kép dùng để làm gì?", options: ["Đánh dấu câu hỏi", "Đánh dấu lời nói trực tiếp hoặc từ ngữ đặc biệt", "Đánh dấu câu cảm thán", "Đánh dấu câu kể"], correctIndex: 1, explanation: "Dấu ngoặc kép dùng để đánh dấu lời nói trực tiếp, tên tác phẩm, hoặc từ ngữ dùng với ý nghĩa đặc biệt." },
        ],
        flashcards: [
          { id: "tv4-f21", front: "Dấu ngoặc kép", back: "Dùng để:\n1. Đánh dấu lời nói trực tiếp\n2. Đánh dấu tên tác phẩm\n3. Đánh dấu từ ngữ có ý nghĩa đặc biệt" },
        ],
        summary: "Bài đọc về cảnh đẹp chùa Hương. Học về dấu ngoặc kép và cách sử dụng trong câu.",
        keyPoints: [
          "Chùa Hương là danh thắng nổi tiếng của Việt Nam",
          "Dấu ngoặc kép dùng cho lời nói trực tiếp, tên tác phẩm, từ ngữ đặc biệt",
        ],
      },
    ],
  },
];

// Completion tracking
const STORAGE_KEY = "learning-progress-v2";

export function getCompletedLessons(): string[] {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

export function toggleLessonComplete(lessonId: string): string[] {
  const completed = getCompletedLessons();
  const idx = completed.indexOf(lessonId);
  if (idx >= 0) {
    completed.splice(idx, 1);
  } else {
    completed.push(lessonId);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(completed));
  return completed;
}
