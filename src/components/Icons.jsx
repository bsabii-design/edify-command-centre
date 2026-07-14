// One icon language: Tabler (1.5px stroke, 24 grid). Local names stay the
// same, so components don't care. Default size 14 — the one icon size of
// the system. strokeWidth is set once here to retune the whole product.
import {
  IconSunHigh, IconMessageCircle, IconLayoutList, IconSettings, IconChevronRight,
  IconSearch, IconZoomCheck, IconClipboardCheck, IconArrowRight, IconHome,
  IconTruckDelivery, IconChefHat, IconObjectScan, IconPackage, IconDatabase, IconStar, IconChecklist,
  IconBuildingStore, IconChevronDown, IconCheck, IconCircleCheck, IconAlertTriangle,
  IconAlertCircle, IconClock, IconArrowBackUp, IconX, IconSparkles, IconSend,
  IconArrowLeft, IconArrowUp, IconShoppingCart, IconFileText, IconArrowNarrowDownDashed,
  IconInfoCircle, IconPlus, IconMinus, IconEye, IconEyeOff,
  IconMicrophone, IconPaperclip, IconSlash, IconCamera, IconLoader2, IconNotes, IconArrowUpRight
} from '@tabler/icons-react'

const wrap = (C) => (p) => <C size={16} stroke={1.75} {...p} />

export const Sun = wrap(IconSunHigh)
export const ChatIcon = wrap(IconMessageCircle)
export const Journal = wrap(IconLayoutList)
export const Gear = wrap(IconSettings)
export const Chevron = wrap(IconChevronRight)
export const Search = wrap(IconSearch)
export const SearchCheck = wrap(IconZoomCheck)
export const ClipboardCheck = wrap(IconClipboardCheck)
export const ArrowRight = wrap(IconArrowRight)
export const Home = wrap(IconHome)
export const Truck = wrap(IconTruckDelivery)
export const Package = wrap(IconPackage)
export const Book = wrap(IconChefHat)
export const Box = wrap(IconObjectScan)
export const BarChart = wrap(IconDatabase)
export const Star = wrap(IconStar)
export const Clipboard = wrap(IconChecklist)
export const Building = wrap(IconBuildingStore)
export const ChevDown = wrap(IconChevronDown)
export const Check = wrap(IconCheck)
export const CheckCircle = wrap(IconCircleCheck)
export const Alert = wrap(IconAlertTriangle)
export const AlertCircle = wrap(IconAlertCircle)
export const Clock = wrap(IconClock)
export const Undo = wrap(IconArrowBackUp)
export const X = wrap(IconX)
export const Spark = wrap(IconSparkles)
export const Send = wrap(IconSend)
export const ArrowUp = wrap(IconArrowUp)
export const Back = wrap(IconArrowLeft)
export const Cart = wrap(IconPackage)
export const Doc = wrap(IconFileText)
export const TrendDown = wrap(IconArrowNarrowDownDashed)
export const Info = wrap(IconInfoCircle)
export const Plus = wrap(IconPlus)
export const Minus = wrap(IconMinus)
export const Eye = wrap(IconEye)
export const EyeOff = wrap(IconEyeOff)
export const Bot = wrap(IconSparkles)
export const Mic = wrap(IconMicrophone)
export const Clip = wrap(IconPaperclip)
export const SlashSq = wrap(IconSlash)
export const Camera = wrap(IconCamera)
export const Spinner = wrap(IconLoader2)
export const Notes = wrap(IconNotes)
export const ExtLink = wrap(IconArrowUpRight)
