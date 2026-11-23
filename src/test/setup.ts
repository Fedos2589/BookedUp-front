import { configure } from '@testing-library/react'

// Первый тест файла грузит страницу lazy-чанком; на медленном CI это дольше
// 1 с по умолчанию (PR #46: calendar.test.tsx).
configure({ asyncUtilTimeout: 5000 })
